import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { useApplicantAuth } from '../context/ApplicantAuthContext';
import { submitApplication } from '../api/client';

const initialState = {
  name: '',
  dateOfBirth: '',
  dependents: '',
  monthlyIncome: '',
  monthlyDebtPayments: '',
  openCreditLines: '',
  realEstateLoans: '',
  creditUtilizationPercent: 30,
  latePayments3059: 0,
  latePayments6089: 0,
  latePayments90plus: 0,
  utilityStreak: 12,
  rechargeRegularity: 50,
  gigTrips: '',
  gigRating: 4.5,
  narrative: '',
};

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

function toApplicantPayload(form) {
  const income = form.monthlyIncome === '' ? null : Number(form.monthlyIncome);
  const debtPayments = form.monthlyDebtPayments === '' ? 0 : Number(form.monthlyDebtPayments);
  const dependents = form.dependents === '' ? null : Number(form.dependents);

  // DebtRatio in the source dataset is monthly debt obligations divided by
  // monthly income. When income is unknown, fall back to a neutral ratio
  // rather than dividing by zero.
  const debtRatio = income && income > 0 ? debtPayments / income : 0.3;

  return {
    RevolvingUtilizationOfUnsecuredLines: Number(form.creditUtilizationPercent) / 100,
    age: calculateAge(form.dateOfBirth),
    'NumberOfTime30-59DaysPastDueNotWorse': Number(form.latePayments3059),
    DebtRatio: debtRatio,
    MonthlyIncome: income ?? 0,
    NumberOfOpenCreditLinesAndLoans: Number(form.openCreditLines || 0),
    NumberOfTimes90DaysLate: Number(form.latePayments90plus),
    NumberRealEstateLoansOrLines: Number(form.realEstateLoans || 0),
    'NumberOfTime60-89DaysPastDueNotWorse': Number(form.latePayments6089),
    NumberOfDependents: dependents ?? 0,
    income_was_missing: income === null ? 1 : 0,
    dependents_was_missing: dependents === null ? 1 : 0,
    utility_payment_streak: Number(form.utilityStreak),
    recharge_regularity_score: Number(form.rechargeRegularity),
    gig_trip_volume: Number(form.gigTrips || 0),
    gig_rating: Number(form.gigRating),
  };
}

function Stepper({ label, value, onChange, max = 20 }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="stepper">
        <button
          type="button"
          className="stepper-btn"
          onClick={() => onChange(Math.max(0, value - 1))}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="stepper-value mono">{value}</span>
        <button
          type="button"
          className="stepper-btn"
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

const MIN_AGE = 18;
const MAX_AGE = 110;

export function ApplicationForm() {
  const { isVerified, token, applicant: account, signIn } = useApplicantAuth();
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  if (!isVerified) {
    return <Navigate to="/verify" replace />;
  }

  const needsName = !account?.name;

  function set(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (needsName && !form.name.trim()) {
      setError('Your name is required.');
      return;
    }

    const age = calculateAge(form.dateOfBirth);
    if (age === null) {
      setError('Date of birth is required.');
      return;
    }
    if (age < MIN_AGE || age > MAX_AGE) {
      setError(`Age must be between ${MIN_AGE} and ${MAX_AGE}.`);
      return;
    }

    setSubmitting(true);
    try {
      const applicant = toApplicantPayload(form);
      const submittedName = needsName ? form.name.trim() : (account?.name || '');
      const result = await submitApplication({
        applicant,
        transactionNarrative: form.narrative || undefined,
        applicantName: needsName ? form.name.trim() : undefined,
        token,
      });
      if (needsName && form.name.trim()) {
        signIn(token, { ...account, name: form.name.trim() });
      }
      navigate('/results', {
        state: {
          result,
          applicant,
          applicantInfo: { name: submittedName, email: account?.email },
          narrative: form.narrative || undefined,
        },
      });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Header />
      <main className="page-narrow" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-3xl)' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 'var(--space-xs)' }}>Your Profile</h1>
        <p className="text-muted" style={{ marginBottom: 'var(--space-xl)' }}>
          We just need a few details to understand your financial picture. Don't worry if you
          don't have perfect answers for everything — we look at the big picture.
        </p>

        <form onSubmit={handleSubmit}>
          <section className="card" style={{ marginBottom: 'var(--space-lg)' }}>
            <h2 className="label-caps" style={{ marginBottom: 'var(--space-md)' }}>About you</h2>
            {needsName && (
              <div className="field">
                <label className="field-label" htmlFor="name">Your name</label>
                <input
                  id="name"
                  className="input"
                  type="text"
                  placeholder="e.g. Priya Sharma"
                  value={form.name}
                  onChange={set('name')}
                  required
                />
              </div>
            )}
            <div className="field">
              <label className="field-label" htmlFor="dob">
                Date of birth
                {form.dateOfBirth && calculateAge(form.dateOfBirth) !== null && (
                  <span className="mono"> ({calculateAge(form.dateOfBirth)} yrs)</span>
                )}
              </label>
              <input
                id="dob"
                className="input"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={form.dateOfBirth}
                onChange={set('dateOfBirth')}
                required
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="dependents">Number of dependents (optional)</label>
              <input
                id="dependents"
                className="input"
                type="number"
                min={0}
                placeholder="e.g. 2"
                value={form.dependents}
                onChange={set('dependents')}
              />
            </div>
          </section>

          <section className="card" style={{ marginBottom: 'var(--space-lg)' }}>
            <h2 className="label-caps" style={{ marginBottom: 'var(--space-md)' }}>Credit &amp; financial history</h2>
            <div className="field">
              <label className="field-label" htmlFor="income">Monthly income (leave blank if it varies)</label>
              <input
                id="income"
                className="input"
                type="number"
                min={0}
                placeholder="e.g. 25000"
                value={form.monthlyIncome}
                onChange={set('monthlyIncome')}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="debt">Total monthly debt payments</label>
              <input
                id="debt"
                className="input"
                type="number"
                min={0}
                placeholder="e.g. 4000"
                value={form.monthlyDebtPayments}
                onChange={set('monthlyDebtPayments')}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="lines">Open credit lines or loans</label>
              <input
                id="lines"
                className="input"
                type="number"
                min={0}
                placeholder="e.g. 3"
                value={form.openCreditLines}
                onChange={set('openCreditLines')}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="realestate">Real estate loans / mortgages</label>
              <input
                id="realestate"
                className="input"
                type="number"
                min={0}
                placeholder="e.g. 1"
                value={form.realEstateLoans}
                onChange={set('realEstateLoans')}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="utilization">
                Credit utilization <span className="mono">{form.creditUtilizationPercent}%</span>
              </label>
              <input
                id="utilization"
                className="slider"
                type="range"
                min={0}
                max={100}
                value={form.creditUtilizationPercent}
                onChange={set('creditUtilizationPercent')}
              />
              <span className="field-hint">What % of your available credit are you currently using?</span>
            </div>

            <h3 className="field-label" style={{ marginTop: 'var(--space-lg)', marginBottom: 'var(--space-sm)' }}>
              Missed payments in the last 2 years
            </h3>
            <div style={{ display: 'grid', gap: 'var(--space-md)', gridTemplateColumns: '1fr 1fr 1fr' }}>
              <Stepper
                label="30-59 days late"
                value={Number(form.latePayments3059)}
                onChange={(v) => setForm((p) => ({ ...p, latePayments3059: v }))}
              />
              <Stepper
                label="60-89 days late"
                value={Number(form.latePayments6089)}
                onChange={(v) => setForm((p) => ({ ...p, latePayments6089: v }))}
              />
              <Stepper
                label="90+ days late"
                value={Number(form.latePayments90plus)}
                onChange={(v) => setForm((p) => ({ ...p, latePayments90plus: v }))}
              />
            </div>
          </section>

          <section
            className="card"
            style={{
              marginBottom: 'var(--space-lg)',
              boxShadow: '0 0 0 1px var(--color-primary) inset, 0 0 30px var(--glass-glow)',
            }}
          >
            <h2 className="label-caps" style={{ marginBottom: 4, color: 'var(--color-primary)' }}>Alternative data</h2>
            <p className="text-muted" style={{ fontSize: 14, marginTop: 0, marginBottom: 'var(--space-lg)' }}>
              We look beyond traditional scores. These factors help us say "yes" to more people —
              whether you're a freelancer, small business owner, student, or new to earning.
            </p>

            <div className="field">
              <label className="field-label" htmlFor="streak">
                Utility payment streak <span className="mono">{form.utilityStreak} mo</span>
              </label>
              <input
                id="streak"
                className="slider"
                type="range"
                min={0}
                max={36}
                value={form.utilityStreak}
                onChange={set('utilityStreak')}
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="recharge">
                Mobile recharge regularity <span className="mono">{form.rechargeRegularity}</span>
              </label>
              <input
                id="recharge"
                className="slider"
                type="range"
                min={0}
                max={100}
                value={form.rechargeRegularity}
                onChange={set('rechargeRegularity')}
              />
              <div className="field-hint" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Irregular</span>
                <span>Very regular</span>
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="trips">
                Income-generating activity (last 30 days)
              </label>
              <input
                id="trips"
                className="input"
                type="number"
                min={0}
                placeholder="e.g. trips completed, jobs done, orders fulfilled"
                value={form.gigTrips}
                onChange={set('gigTrips')}
              />
              <span className="field-hint">
                Any countable measure of activity — platform trips, freelance jobs, shop
                transactions, tuition sessions, whatever applies to your work.
              </span>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="rating">
                Platform or client rating, if applicable <span className="mono">{Number(form.gigRating).toFixed(1)}</span>
              </label>
              <input
                id="rating"
                className="slider"
                type="range"
                min={1}
                max={5}
                step={0.1}
                value={form.gigRating}
                onChange={set('gigRating')}
              />
              <span className="field-hint">
                From a gig app, marketplace, or client feedback. Leave at the default if this
                doesn't apply to you.
              </span>
            </div>
          </section>

          <section className="card" style={{ marginBottom: 'var(--space-lg)' }}>
            <label className="label-caps" htmlFor="narrative" style={{ display: 'block', marginBottom: 'var(--space-md)' }}>
              Tell us about your income (optional)
            </label>
            <textarea
              id="narrative"
              className="input"
              placeholder="e.g. I run a small tailoring shop, or I do freelance design work, or I'm a student with a part-time tutoring income."
              value={form.narrative}
              onChange={set('narrative')}
              maxLength={2000}
            />
            <p className="field-hint" style={{ marginTop: 'var(--space-sm)' }}>
              Please don't include personal details like religion, marital status, or caste — we
              don't use this information in our decision and remove it automatically.
            </p>
          </section>

          {error && (
            <div className="card" style={{ borderColor: 'var(--color-reject)', background: 'var(--color-reject-soft)', marginBottom: 'var(--space-lg)' }}>
              <p style={{ color: 'var(--color-reject)', margin: 0, fontSize: 14 }}>{error}</p>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting} style={{ fontSize: 16, padding: '14px' }}>
            {submitting ? 'Getting your decision…' : 'Get my decision →'}
          </button>
        </form>
      </main>
    </>
  );
}

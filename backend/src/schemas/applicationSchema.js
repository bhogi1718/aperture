import { z } from "zod";

export const applicantFeaturesSchema = z.object({
  RevolvingUtilizationOfUnsecuredLines: z.number().min(0),
  age: z.number().int().min(18).max(110),
  "NumberOfTime30-59DaysPastDueNotWorse": z.number().int().min(0),
  DebtRatio: z.number().min(0),
  MonthlyIncome: z.number().min(0),
  NumberOfOpenCreditLinesAndLoans: z.number().int().min(0),
  NumberOfTimes90DaysLate: z.number().int().min(0),
  NumberRealEstateLoansOrLines: z.number().int().min(0),
  "NumberOfTime60-89DaysPastDueNotWorse": z.number().int().min(0),
  NumberOfDependents: z.number().min(0),
  income_was_missing: z.union([z.literal(0), z.literal(1)]),
  dependents_was_missing: z.union([z.literal(0), z.literal(1)]),
  utility_payment_streak: z.number().int().min(0).max(36),
  recharge_regularity_score: z.number().min(0).max(100),
  gig_trip_volume: z.number().int().min(0),
  gig_rating: z.number().min(1).max(5),
});

export const createApplicationSchema = z.object({
  applicant: applicantFeaturesSchema,
  transactionNarrative: z.string().max(2000).optional(),
});

-- Habilita Row Level Security (RLS) em todas as tabelas do app no Supabase.
--
-- Contexto: o União LocaCar usa Supabase só como Postgres (Prisma + backend na EC2).
-- A API REST automática do Supabase (roles anon/authenticated) fica bloqueada
-- sem políticas RLS. A conexão do backend (usuário postgres) continua normal.
--
-- Como aplicar:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Cole este arquivo e execute (Run)
--   3. Security Advisor → os alertas de RLS devem sumir
--
-- Alternativa: npm run db:migrate -w backend (migration equivalente no repositório)
--
-- Verificação (deve retornar rowsecurity = true em todas):
--   SELECT tablename, rowsecurity
--   FROM pg_tables
--   WHERE schemaname = 'public'
--   ORDER BY tablename;

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Partner" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OwnerProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DriverProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vehicle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MarketplaceExposureEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HighlightPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HighlightPlatformConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VehicleHighlightOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VehicleDriverBlock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VehiclePhoto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Rental" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RentalFinancialSummary" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RentalFinancialEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RentalInspection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RentalInspectionPhoto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RentalReview" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PasswordResetToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdCampaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VehicleBrand" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VehicleModel" ENABLE ROW LEVEL SECURITY;

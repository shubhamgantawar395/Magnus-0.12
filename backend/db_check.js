const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const customers = await prisma.customer.findMany({ select: { id: true, companyName: true, organizationId: true } });
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });
  const users = await prisma.user.findMany({ where: { email: { in: ['ppc@orgA.com','tk@orgA.com','admin@orgA.com'] } }, select: { email: true, role: true, organizationId: true } });
  const vendors = await prisma.vendor.findMany({ select: { id: true, companyName: true, vendorCode: true, organizationId: true }, take: 10 });
  console.log('CUSTOMERS:', JSON.stringify(customers));
  console.log('ORGS:', JSON.stringify(orgs));
  console.log('USERS:', JSON.stringify(users));
  console.log('VENDORS:', JSON.stringify(vendors));
}
main().catch(console.error).finally(() => prisma.$disconnect());

/**
 * Database seeder — populates the database with sample diagnostic centres and tests.
 * Usage: npm run db:seed
 */
require('dotenv').config();
const { connectDB } = require('../config/database');
const { DiagnosticCentre, DiagnosticTest } = require('../models');
const logger = require('../utils/logger');

const seedData = [
  {
    centre: {
      name: 'Apollo Diagnostics',
      address: '123 MG Road, Jubilee Hills',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500033',
      phone: '040-12345678',
    },
    tests: [
      { name: 'Complete Blood Count (CBC)', description: 'Measures red blood cells, white blood cells, hemoglobin, hematocrit, and platelets', price: 450.00 },
      { name: 'Lipid Profile', description: 'Measures total cholesterol, HDL, LDL, and triglycerides', price: 800.00 },
      { name: 'Thyroid Profile (T3, T4, TSH)', description: 'Evaluates thyroid gland function', price: 1200.00 },
      { name: 'HbA1c', description: 'Measures average blood sugar over the past 2-3 months', price: 600.00 },
      { name: 'Liver Function Test (LFT)', description: 'Assesses liver health by measuring enzymes, proteins, and bilirubin', price: 700.00 },
    ],
  },
  {
    centre: {
      name: 'Dr. Lal PathLabs',
      address: '45 Connaught Place',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
      phone: '011-98765432',
    },
    tests: [
      { name: 'Complete Blood Count (CBC)', description: 'Standard blood panel', price: 400.00 },
      { name: 'Kidney Function Test (KFT)', description: 'Measures creatinine, BUN, uric acid, and electrolytes', price: 900.00 },
      { name: 'Vitamin D Test', description: 'Measures 25-hydroxy vitamin D levels in blood', price: 1100.00 },
      { name: 'Urine Routine Examination', description: 'Physical, chemical, and microscopic analysis of urine', price: 250.00 },
      { name: 'COVID-19 RT-PCR', description: 'Molecular test for SARS-CoV-2 detection', price: 500.00 },
    ],
  },
  {
    centre: {
      name: 'SRL Diagnostics',
      address: '78 Linking Road, Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400050',
      phone: '022-55667788',
    },
    tests: [
      { name: 'Comprehensive Metabolic Panel', description: 'Measures glucose, calcium, electrolytes, kidney and liver markers', price: 1500.00 },
      { name: 'Iron Studies', description: 'Measures serum iron, ferritin, TIBC', price: 850.00 },
      { name: 'Vitamin B12 Test', description: 'Measures vitamin B12 levels in blood', price: 900.00 },
      { name: 'ECG (Electrocardiogram)', description: 'Records electrical signals from the heart', price: 350.00 },
      { name: 'Chest X-Ray', description: 'Imaging of chest, lungs, heart, and blood vessels', price: 600.00 },
    ],
  },
];

const seed = async () => {
  try {
    await connectDB();

    // Clear existing data
    await DiagnosticTest.destroy({ where: {} });
    await DiagnosticCentre.destroy({ where: {} });

    for (const entry of seedData) {
      const centre = await DiagnosticCentre.create(entry.centre);
      logger.info(`Created centre: ${centre.name}`);

      for (const testData of entry.tests) {
        await DiagnosticTest.create({
          ...testData,
          centre_id: centre.id,
        });
      }
      logger.info(`  → Added ${entry.tests.length} tests`);
    }

    logger.info('✅ Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();

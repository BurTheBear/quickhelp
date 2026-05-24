import 'dotenv/config';
import { PrismaClient, RequestCategory, UrgencyLevel, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CATEGORIES: RequestCategory[] = [
  'ELDERLY_ASSISTANCE', 'TUTORING', 'FOOD_DELIVERY',
  'COMMUNITY_CLEANUP', 'PET_HELP', 'TECH_SUPPORT',
  'TRANSPORTATION', 'EMERGENCY', 'OTHER',
];

const URGENCIES: UrgencyLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'];

const SAMPLE_REQUESTS = [
  { title: 'Help setting up my new iPhone', desc: 'I bought an iPhone 15 but struggling to transfer data from Android. Could use someone tech-savvy for 30 min.', cat: 'TECH_SUPPORT', urgency: 'LOW', mins: 30 },
  { title: 'Walk my dog while I visit the hospital', desc: 'My mom is in the hospital and I need someone to walk Buddy (Golden Retriever, friendly) for about 45 minutes.', cat: 'PET_HELP', urgency: 'HIGH', mins: 45 },
  { title: 'Pick up groceries from Whole Foods', desc: 'I have mobility issues and can\'t leave my apartment. Need someone to pick up a short grocery list. Will reimburse + tip.', cat: 'FOOD_DELIVERY', urgency: 'MEDIUM', mins: 60 },
  { title: 'Help me study for math exam tomorrow', desc: 'Taking calc exam tomorrow and stuck on integration by parts. Need a tutor for 2 hours.', cat: 'TUTORING', urgency: 'HIGH', mins: 120 },
  { title: 'Clear leaves from elderly neighbor\'s yard', desc: 'My 80-year-old neighbor can\'t do yard work anymore. Her front yard needs leaf clearing.', cat: 'ELDERLY_ASSISTANCE', urgency: 'LOW', mins: 90 },
  { title: 'Urgent: Need a ride to urgent care', desc: 'Twisted my ankle and can\'t drive. Need a ride to urgent care about 3 miles away.', cat: 'TRANSPORTATION', urgency: 'EMERGENCY', mins: 20 },
  { title: 'Community park cleanup this Saturday', desc: 'Organizing a small cleanup at Riverside Park. Need 3-5 volunteers for 2 hours.', cat: 'COMMUNITY_CLEANUP', urgency: 'LOW', mins: 120 },
  { title: 'Help fix a leaky faucet', desc: 'Kitchen faucet has been dripping for a week. Need someone handy to help identify the issue.', cat: 'OTHER', urgency: 'MEDIUM', mins: 60 },
  { title: 'Teach me basic Excel formulas', desc: 'Need to learn SUM, VLOOKUP, and pivot tables for my new job. 1-1.5 hours would be great.', cat: 'TUTORING', urgency: 'MEDIUM', mins: 90 },
  { title: 'Help moving boxes to storage unit', desc: 'Moving out of my apartment and have about 10 medium boxes to move 5 blocks to a storage unit.', cat: 'OTHER', urgency: 'LOW', mins: 45 },
];

const BADGES = [
  { name: 'First Helper', description: 'Complete your first help task', iconUrl: '🤝', category: 'task', rarity: 'COMMON', xpReward: 20, criteria: { type: 'tasks_completed', threshold: 1 } },
  { name: 'Helping Hand', description: 'Complete 10 help tasks', iconUrl: '👐', category: 'task', rarity: 'COMMON', xpReward: 50, criteria: { type: 'tasks_completed', threshold: 10 } },
  { name: 'Community Pillar', description: 'Complete 50 help tasks', iconUrl: '🏛️', category: 'milestone', rarity: 'RARE', xpReward: 200, criteria: { type: 'tasks_completed', threshold: 50 } },
  { name: 'Century Club', description: 'Complete 100 help tasks', iconUrl: '💯', category: 'milestone', rarity: 'EPIC', xpReward: 500, criteria: { type: 'tasks_completed', threshold: 100 } },
  { name: 'Rising Star', description: 'Reach Level 3', iconUrl: '⭐', category: 'level', rarity: 'COMMON', xpReward: 30, criteria: { type: 'level_reached', threshold: 3 } },
  { name: 'Local Hero', description: 'Reach Level 5', iconUrl: '🦸', category: 'level', rarity: 'RARE', xpReward: 100, criteria: { type: 'level_reached', threshold: 5 } },
  { name: 'Community Legend', description: 'Reach the max level', iconUrl: '👑', category: 'level', rarity: 'LEGENDARY', xpReward: 1000, criteria: { type: 'level_reached', threshold: 10 } },
  { name: 'Five Star Helper', description: 'Maintain a 4.8+ average rating', iconUrl: '⭐⭐⭐⭐⭐', category: 'social', rarity: 'RARE', xpReward: 150, criteria: { type: 'rating_above', threshold: 4.8 } },
];

const CHALLENGES = [
  {
    title: 'Spring Helpers Week',
    description: 'Complete 5 tasks this week to earn bonus XP and a special badge.',
    category: 'ALL',
    goal: 5,
    xpReward: 200,
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
  {
    title: 'Elderly Care Champion',
    description: 'Help 3 elderly community members this month.',
    category: 'ELDERLY_ASSISTANCE',
    goal: 3,
    xpReward: 300,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  },
  {
    title: 'Tech Guru',
    description: 'Complete 5 tech support tasks.',
    category: 'TECH_SUPPORT',
    goal: 5,
    xpReward: 250,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  },
];

// SF Bay Area sample locations
const LOCATIONS = [
  { lat: 37.7749, lng: -122.4194, city: 'San Francisco' },
  { lat: 37.8044, lng: -122.2712, city: 'Oakland' },
  { lat: 37.3382, lng: -121.8863, city: 'San Jose' },
  { lat: 37.5630, lng: -122.0580, city: 'Fremont' },
  { lat: 37.6879, lng: -122.4702, city: 'Daly City' },
];

const USERS = [
  { email: 'alice@example.com', name: 'Alice Chen', bio: 'Software engineer who loves helping people with tech.', skills: ['tech_support', 'tutoring', 'programming'] },
  { email: 'bob@example.com', name: 'Bob Martinez', bio: 'Retired teacher always happy to help with tutoring.', skills: ['tutoring', 'elderly_assistance'] },
  { email: 'carol@example.com', name: 'Carol Johnson', bio: 'College student with a car and free weekends.', skills: ['transportation', 'food_delivery', 'community_cleanup'] },
  { email: 'david@example.com', name: 'David Kim', bio: 'Dog lover and dog walker in training.', skills: ['pet_help', 'community_cleanup'] },
  { email: 'emma@example.com', name: 'Emma Wilson', bio: 'Nurse who wants to help her community outside of work.', skills: ['elderly_assistance', 'emergency', 'tech_support'] },
  { email: 'frank@example.com', name: 'Frank Thomas', bio: 'Handyman looking to do good. 15 years of home repair experience.', skills: ['other', 'community_cleanup'] },
];

async function main() {
  console.log('🌱 Seeding QuickHelp database...\n');

  // Clean up existing data
  await prisma.$executeRaw`TRUNCATE TABLE
    "xp_events", "user_badges", "user_achievements", "user_challenge_progress",
    "user_streaks", "user_gamification", "notifications", "messages", "conversations",
    "ratings", "matches", "request_images", "help_requests", "user_devices",
    "user_profiles", "group_members", "community_groups", "reports",
    "badges", "achievements", "challenges", "users"
    CASCADE`;

  // Create admin user
  const adminHash = await bcrypt.hash('Admin@QuickHelp1', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@quickhelp.app',
      passwordHash: adminHash,
      role: UserRole.SUPER_ADMIN,
      verificationLevel: 'ID_VERIFIED',
      profile: { create: { displayName: 'QuickHelp Admin', bio: 'Platform administrator', skills: [] } },
      gamification: { create: { totalXp: 9999, level: 10, levelName: 'Community Legend' } },
      streaks: { create: { currentStreak: 30, longestStreak: 100 } },
    },
  });
  console.log(`✅ Admin user: admin@quickhelp.app / Admin@QuickHelp1`);

  // Create badges
  await prisma.badge.createMany({ data: BADGES.map((b) => ({ ...b, iconUrl: b.iconUrl })) });
  console.log(`✅ ${BADGES.length} badges created`);

  // Create challenges
  await prisma.challenge.createMany({ data: CHALLENGES });
  console.log(`✅ ${CHALLENGES.length} challenges created`);

  console.log(`\n🎉 Seed completed successfully!`);
  console.log(`\n📋 Login:`);
  console.log(`   Admin: admin@quickhelp.app / Admin@QuickHelp1`);
}

main()
  .catch((err) => { console.error('❌ Seed failed:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());

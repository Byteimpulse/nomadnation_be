# Seeders Documentation

This project contains multiple seeders to populate Firebase Firestore database with initial data.

## Available Seeders

| Seeder                | Collection              | Description                                           |
| --------------------- | ----------------------- | ----------------------------------------------------- |
| **languages**         | `languages`             | Populates supported languages for the app             |
| **currencies**        | `currencies`            | Populates currency preferences for transactions       |
| **ride-sharing**      | `rideSharingServices`   | Populates ride-sharing service options                |
| **activities**        | `favoriteActivities`    | Populates favorite activity preferences               |
| **fitness**           | `fitnessInterests`      | Populates fitness interest options                    |
| **comm-apps**         | `communicationApps`     | Populates communication app preferences               |
| **comm-channels**     | `communicationChannels` | Populates communication channel options               |
| **excursion-buckets** | `excursionBuckets`      | Populates regional excursion collections by continent |

## Running Specific Seeder

```bash
# Seed to Firebase (automatically clears old data first)
npm run seed:<SEEDER>

# Clear all (manual clearing if needed)
npm run seed:<SEEDER>:clear
```

## Running All Seeders

**Option 1: Master Seeder (Recommended)**

```bash
npm run seed:all
```

**Option 2: Individual Seeders**

```bash
npm run seed:languages && npm run seed:currencies && npm run seed:ride-sharing && npm run seed:activities && npm run seed:fitness && npm run seed:comm-apps && npm run seed:comm-channels && npm run seed:excursion-buckets
```

# sarasavi-game-development

Sarasavi book-cover memory game built with React, Vite, Firebase Authentication, and Cloud Firestore.

## Local setup

1. Install dependencies:

   ```powershell
   corepack pnpm install --frozen-lockfile
   ```

2. Copy `.env.example` to `.env.local` and add the Firebase web configuration.

3. Start the app:

   ```powershell
   corepack pnpm dev
   ```

4. Open the game at `http://localhost:8443/` and the admin panel at `http://localhost:8443/#/admin`.

## Firebase Console setup

1. Create a Cloud Firestore database.
2. In **Authentication → Sign-in method**, enable **Email/Password**.
3. In **Authentication → Users**, create the administrator email/password account.
4. Deploy `firestore.rules` and `firestore.indexes.json`:

   ```powershell
   npx firebase-tools deploy --only firestore --project game-development-8b555
   ```

5. Add every `VITE_FIREBASE_*` value from `.env.example` to the hosting provider's environment variables before building.

## Data layout

- `sarasavi_memory_books/{bookId}` — book metadata and compressed Base64 cover image.
- `sarasavi_memory_ads/{adId}` — advertisements and compressed Base64 image.
- `sarasavi_memory_config/game_settings` — game settings and compressed Base64 logo.
- `sarasavi_memory_config/global_stats` — aggregate game statistics.

Images are resized and converted to WebP Base64 with `avatar64`; Firebase Storage is not used.

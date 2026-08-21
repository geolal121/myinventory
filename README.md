# MyInventory

Mobile-first truck inventory for technician 72485 at the Los Angeles branch.

## Local development

```bash
npm install
npm run dev
```

The Firebase web configuration is read from the existing `.env` file.

## One-time secure login setup

Before publishing the authenticated version:

1. Open Firebase Console for project `myinventory-a95a1`.
2. Go to **Authentication → Sign-in method** and enable **Email/Password**.
3. Go to **Authentication → Users → Add user**.
4. Use this internal login email:
   `72485@myinventory.local`
5. Create a private password with at least six characters. Do not put the
   password in this repository or an environment file.
6. Deploy the app and the owner-only Firestore rules together.

The app displays **Branch**, **Tech ID**, and **Private Password**. It converts
the Los Angeles branch and Tech ID 72485 into the internal Firebase login email.
There is no public account-registration screen.

## Verification

```bash
npm test
npm run lint
npm run build
```

The checked-in `firestore.rules` file replaces public database access with an
owner-only rule for the internal login identity above.

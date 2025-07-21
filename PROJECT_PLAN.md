# Project Plan: Photo Challenge Game

This document outlines the features, architecture, and implementation plan for the Photo Challenge Game application.

## 1. Core Concept

The application is a game where users participate in daily photo challenges to win prize money. The system is designed to be fair and engaging, rewarding users for correct submissions rather than speed.

## 2. User Experience (The Player)

### Registration and Login
-   **Login Identifier:** Users register and log in using their **phone number** and a **password**.
-   **Private Information:** A user's full name and phone number are collected at registration but are kept private and are only visible to the admin for prize payout.

### Gameplay
-   **Challenge Board:** When a user logs in, they see a list of all active photo challenges.
-   **Independent Challenges:** Each challenge is a separate contest. Users can participate in any challenge they choose, in any order.
-   **One Submission Per Challenge:** A user gets only one attempt to upload a photo for each challenge. The submission cannot be changed after it is uploaded.

### Winning and Payouts
-   **Admin Approval:** An admin reviews every photo submission. If a photo correctly matches the challenge description, the admin approves it.
-   **Earning Money:** A user wins the prize money for each individual challenge their photo is approved for.
-   **Total Winnings:** The user's total daily earnings are the sum of all the prizes from the challenges they have won.

## 3. Admin Experience

### Admin Dashboard
-   Admins have access to a special dashboard that is not visible to regular users.

### Challenge Management
-   **Create Challenges:** Admins can create new photo challenges, providing a description and a prize amount for each.
-   **Activate/Deactivate Challenges:** Admins can turn challenges on or off.

### Submission Review
-   **Review Queue:** The admin dashboard has a queue of all pending photo submissions.
-   **Approve/Reject:** The admin can view each submission and approve or reject it with a single click.

## 4. Technical Architecture

### Authentication
-   The application uses **Supabase's built-in authentication system**.
-   To accommodate phone number logins, a "fake" email address (`<phone_number>@allpeople.app`) is generated under the hood.
-   The **"Confirm email"** feature in Supabase is **turned OFF** to allow this system to work.

### Supabase Database Schema

#### `users` table
-   `id` (uuid, Primary Key, Foreign Key to `auth.users.id`)
-   `full_name` (text)
-   `phone_number` (text, Unique)
-   `is_admin` (boolean)

#### `challenges` table
-   `id` (uuid, Primary Key)
-   `description` (text)
-   `prize_amount` (numeric)
-   `is_active` (boolean)

#### `submissions` table
-   `id` (uuid, Primary Key)
-   `user_id` (uuid, Foreign Key to `users.id`)
-   `challenge_id` (uuid, Foreign Key to `challenges.id`)
-   `image_url` (text)
-   `status` (text: 'pending', 'approved', 'rejected')

### Row Level Security (RLS)
-   **`users`:** Users can only view their own data.
-   **`challenges`:** All logged-in users can view active challenges. Admins have full access.
-   **`submissions`:** Users can view their own submissions and create new ones. Admins have full access.

## 5. Future UI/UX Direction
-   The user dashboard will be redesigned to resemble a **WhatsApp-style chat interface**, where challenges are received as messages and submissions are sent as replies. 
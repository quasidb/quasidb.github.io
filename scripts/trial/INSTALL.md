# QDB Sheet 14-day free trial: install guide

About 10 minutes, once. Everything runs on your own Google account, so no extra service or password is needed.

## What you end up with

- **quasidb.com/trial/**: people enter their Google email and tick the consent box.
- A private Google Sheet called **QDB Trials**: one row per trial, which is your log.
- The script **shares the QDB Sheet** with them straight away and emails a welcome with a 14-day plan.
- **Day 11**: a "your trial ends in 3 days" email with the PayPal and Patreon links.
- **Day 14**: access is removed automatically and they get a short "trial ended" note.
- You get an email for every new trial.

## Step 1: Make the log sheet

1. Go to [sheets.new](https://sheets.new) (signed in as the account that **owns the QDB Sheet**).
2. Name it **QDB Trials**.

## Step 2: Paste the script

1. In QDB Trials, click **Extensions > Apps Script**.
2. Delete what's in `Code.gs` and paste in everything from [`Code.gs`](Code.gs) (in GitHub, the "Copy raw file" button copies it all).
3. Check the settings at the top:
   - `TRIAL_SHEET_ID` is set to your main **"Quasidb - Retail sentiment"** sheet. To trial a copy instead, put that copy's id here (the long part of its link between `/d/` and `/edit`).
   - `ACCESS` is `'viewer'`. Use whatever paying members get.
4. Click the **Save** icon. Name the project **QDB Trials**.

## Step 3: Run setup once

1. In the function box at the top, choose **setup** and click **Run**.
2. Google asks for permission. Click **Review permissions**, pick your account, then **Advanced > Go to QDB Trials (unsafe) > Allow**. "Unsafe" only means you wrote it yourself and Google hasn't reviewed it. It asks for: your spreadsheets (the log), Drive (to share and un-share the QDB Sheet), sending email as you, and running on a timer.
3. Back in the QDB Trials sheet, a **Trials** tab appears with the column headings. Reload the sheet and you'll also see a **QDB Trials** menu.

## Step 4: Put it online (the web app)

1. In Apps Script, click **Deploy > New deployment**.
2. Click the cog next to "Select type" and choose **Web app**.
3. Set:
   - Description: `QDB trial form`
   - **Execute as: Me**
   - **Who has access: Anyone**
4. Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).
5. **Send me that URL** in the project chat and I'll put it into the page. (Or edit `trial/index.html` yourself and replace `PASTE_WEB_APP_URL_HERE`.)

Until the URL is in, the form still works: it opens the visitor's email app with a trial request addressed to you, so nothing is lost.

## Step 5: Test it

1. **QDB Trials menu > Send me a test welcome email**: you'll get all three emails so you can check the wording.
2. Use the form on quasidb.com/trial/ with a second Gmail (not one that already has the QDB Sheet). A row appears, the sheet is shared and the welcome email arrives.
3. To test the ending without waiting 14 days: in that row, change the **Ends** date to yesterday, then **QDB Trials menu > Run the hourly check now**. Access is removed and the "trial ended" email arrives.

## Day to day

| Status | What it means |
| --- | --- |
| `active` | Trial running. Reminder at day 11, removed at day 14. |
| `paid` | **Type this when someone pays.** Their access is never removed. |
| `pending` | Waiting for you (over the daily cap, or auto-approve is off). |
| `approve` | Type this to start a pending trial. It starts within the hour. |
| `ended` | Trial over, access removed. |
| `member` | They already had access, so nothing was changed. |
| `error` | Usually not a Google account. The Notes column says why. |

- **Someone pays**: type `paid` in their Status cell before day 14. If they pay after it ended, share the sheet with them as you do now.
- **Someone asks to be deleted**: delete their row.
- **Marketing opt-in** column shows who said yes to news and offers. Only email those people with promotions.
- **Pause trials**: set `AUTO_APPROVE: false` in the script and save. New requests wait as `pending`.

## Good to know

- **Stop copying (recommended).** A trial user could make their own copy of a sheet they can view. In the QDB Sheet, click **Share > cog icon** and untick **"Viewers and commenters can see the option to download, print, and copy"**. This affects paying viewers too, so only do it if that's fine for them.
- **One trial per Google account.** Gmail tricks such as dots or `+trial` in the address are treated as the same account.
- **Daily cap.** After 25 new trials in a day the rest wait for you (`MAX_NEW_PER_DAY`). It's a safety valve against spam.
- **Gmail limit.** A free Gmail account can send about 100 script emails a day, which covers this comfortably.
- **Records are deleted** 12 months after a trial ends, unless the person opted in to news or is marked `paid`. That matches the privacy notice on the trial page.
- **Changing the script later**: after editing, use **Deploy > Manage deployments > edit (pencil) > Version: New version > Deploy**. The URL stays the same.

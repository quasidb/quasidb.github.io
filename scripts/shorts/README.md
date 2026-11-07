# QDB Shorts

Turns the games in `/games` into vertical YouTube Shorts (1080x1920, 30fps, under 60s), with no screen recording by hand.

For each game a script opens the page in a phone-sized browser, plays a short scripted round with a visible "finger" doing the taps and drags, adds a title card, captions and a closing "Play free" card, and saves an MP4. The page runs on a fake clock and every frame is captured separately, so the video is smooth and sharp however slow the computer is, and it comes out the same every time.

| Game | What the clip shows |
| --- | --- |
| `stop-hunter` | Stop under the obvious swing low gets eaten, then a stop beyond supply survives and the target hits |
| `order-book-walls` | The trapped all-in crowd builds a wall on daily demand, then the tallest bar (the crowd's stops) gets sliced |
| `crowd-express` | Boarding early at supply against the crowd, then jumping on between stations |
| `stick-to-the-plan` | Going 3% on a "perfect" setup, hands off NFP, a chance card handled on plan |
| `retail-survival-simulator` | Holding a 10:1 long through the Lehman weekend all the way to the margin call |

Each recording also writes `out/<game>.txt` and `out/<game>.json` with the title, description (game link, plus the FXSSI affiliate link for Stop Hunter and Order Book Walls) and tags.

## Option 1: GitHub Actions (nothing to install)

1. Open the repository on GitHub, then **Actions**, then **Record YouTube Shorts**, then **Run workflow**.
2. Pick a game (or `all`). Leave **upload** unticked to only record.
3. When the run finishes (about 2 to 3 minutes per game), download the **shorts** file at the bottom of the run page. It holds the MP4s and the title and description text for each.

Tick **upload** to also post them to YouTube once the setup below is done. Uploads are **private** by default, so nothing is public until you check it and publish it in YouTube Studio. You can also pick a time in **publish_at** to have YouTube publish it for you.

## Option 2: on your own computer

You need [Node.js](https://nodejs.org) 18 or newer and [ffmpeg](https://ffmpeg.org/download.html).

```bash
cd scripts/shorts
npm install
npx playwright install chromium

node record.js                     # every game -> out/*.mp4
node record.js stop-hunter         # one game
node record.js --preview all       # quick lower-quality drafts
node record.js stop-hunter --music ~/Music/track.mp3   # quiet background music
node record.js --base https://quasidb.github.io        # record the live site instead of this checkout
```

## Uploading to YouTube

### One-time setup (about 15 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/), create a project (for example "QDB Shorts"), then open **APIs & Services → Library** and enable **YouTube Data API v3**.
2. **APIs & Services → OAuth consent screen**: choose **External**, fill in the app name and your email, and add the scope `https://www.googleapis.com/auth/youtube.upload`. Add your Google account as a test user.
3. On the same screen press **Publish app** so it shows **In production**. If it stays in "Testing", Google expires the sign-in after 7 days and uploads stop working. You don't need Google's verification for your own channel; you'll just see an "unverified app" warning when you sign in (click **Advanced → Go to …**).
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**, type **Desktop app**. Copy the client ID and client secret.
5. Get a refresh token, either way:
   - **With Node installed**: run `YT_CLIENT_ID=… YT_CLIENT_SECRET=… node upload.js auth`, open the link it prints and sign in with the account that owns the channel. It prints the refresh token and saves everything to `scripts/shorts/.yt-credentials.json` (git-ignored) for local uploads.
   - **Without installing anything**: create a second OAuth client of type **Web application** with the redirect URI `https://developers.google.com/oauthplayground`. In the [OAuth Playground](https://developers.google.com/oauthplayground), open the gear icon, tick **Use your own OAuth credentials** and paste that client's ID and secret. Enter the scope `https://www.googleapis.com/auth/youtube.upload`, press **Authorize APIs**, sign in, then **Exchange authorization code for tokens** and copy the refresh token. Use this Web client's ID and secret in the secrets below.
6. In the GitHub repository go to **Settings → Secrets and variables → Actions** and add three secrets: `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN`.

### Important: new API projects upload as private only

YouTube locks videos uploaded through the API to **private** until the Google Cloud project passes YouTube's API compliance audit. Until then the upload works, but you can't switch those videos to public. To lift it, submit the [YouTube API Services audit form](https://support.google.com/youtube/contact/yt_api_form) for the project, describing it as "uploads our own game clips to our own channel". It usually takes a few weeks.

Until the audit passes, the quickest route is to run the workflow without uploading, download the clips, and post them from the YouTube app or YouTube Studio, pasting the title and description from the matching `.txt` file. A scheduler such as Metricool or Buffer can post the same MP4 to Shorts, X and TikTok in one go.

### Uploading from your computer

```bash
node upload.js out/stop-hunter.mp4                        # private
node upload.js out/stop-hunter.mp4 --privacy unlisted
node upload.js out/stop-hunter.mp4 --publish-at 2026-11-14T17:00:00Z
node upload.js out/*.mp4 --dry-run                        # show what would be sent
```

## Adding or changing a clip

Each game's clip is one file in `games/`. The steps read like a script:

```js
await d.card(introCard('A FREE QDB GAME', 'Stop <em>Hunter</em>', 'Can you hide your stop?'));
await d.tap('text=Start hunting');            // finger moves over, taps, page reacts
await d.reveal('.chartbox');                   // glide the camera so the chart sits under the caption
await d.caption('Trade 1: stop under the <b>obvious swing low</b>', { hold: 2600 });
await d.drag(x1, y1, x2, y2);                  // drag with the finger
await d.wait(3000);                            // let the animation play
await d.card(outroCard('Stop Hunter', 'stop-hunter', 'Only trade the SLCs at key strong levels.'), { hold: 4000, fadeOut: 0 });
```

A new game needs a new file in `games/` with a `slug` matching its folder under `/games`, plus its name in the workflow's `game` list. If a game's buttons or layout change, its clip script may need a matching tweak; the recorder stops with an error naming the button it couldn't find rather than producing a broken clip. Keep clips under 60 seconds: the recorder refuses anything much longer.

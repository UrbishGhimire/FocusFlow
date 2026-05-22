import webpush from 'web-push';
import fs from 'fs';

const subscription = JSON.parse(fs.readFileSync('./scripts/subscription.json', 'utf-8'));

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VITE_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const payload = JSON.stringify({
  title: 'FocusFlow Test',
  body: 'If you see this, push is wired correctly.',
  url: '/',
});

webpush.sendNotification(subscription, payload).then(() => {
  console.log('Push sent');
}).catch((err) => {
  console.error('Push failed', err);
});
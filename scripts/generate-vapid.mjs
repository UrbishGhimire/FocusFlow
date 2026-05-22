import webpush from 'web-push';

const { publicKey, privateKey } = webpush.generateVAPIDKeys();
const subject = process.env.VAPID_SUBJECT || 'mailto:you@example.com';

console.log('VAPID_PUBLIC_KEY=' + publicKey);
console.log('VAPID_PRIVATE_KEY=' + privateKey);
console.log('VAPID_SUBJECT=' + subject);

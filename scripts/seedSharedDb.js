import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { deleteDoc, doc, getFirestore, setDoc } from 'firebase/firestore';
import { sampleListings } from './sampleListings.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCAaWYeGv1B9PqbdxYlXawwL2pjO1RPMVs',
  authDomain: 'notmarketplace.firebaseapp.com',
  projectId: 'notmarketplace',
  appId: '1:258687618136:web:3b3bb88914264b519f4e2d',
};

const email = process.env.SEED_EMAIL;
const password = process.env.SEED_PASSWORD;
const confirmed = process.argv.includes('--confirm');
const deleting = process.argv.includes('--delete');

function getListingId(index) {
  return `sample-${String(index + 1).padStart(2, '0')}`;
}

function getImageDataUrl(imageName) {
  const bytes = readFileSync(new URL(`./images/${imageName}.jpg`, import.meta.url));
  return `data:image/jpeg;base64,${bytes.toString('base64')}`;
}

async function run() {
  const action = deleting ? 'delete' : 'save';

  if (!confirmed) {
    console.log(`Dry run: this would ${action} ${sampleListings.length} listings in the SHARED project "${firebaseConfig.projectId}".`);
    if (!deleting) {
      const biggest = Math.max(...sampleListings.map((listing) => getImageDataUrl(listing.image).length));
      console.log(`Each listing includes its picture. The largest picture is ${Math.round(biggest / 1024)} KB (Firestore allows 1024 KB per listing).`);
    }
    console.log('Nothing was changed. Add --confirm to do it for real.');
    return;
  }

  if (!email || !password) {
    console.log('Set SEED_EMAIL and SEED_PASSWORD to your own login first.');
    return;
  }

  const app = initializeApp(firebaseConfig);
  const credential = await signInWithEmailAndPassword(getAuth(app), email, password);
  const db = getFirestore(app);
  const oneDay = 24 * 60 * 60 * 1000;
  let done = 0;

  for (let i = 0; i < sampleListings.length; i++) {
    const productRef = doc(db, 'products', getListingId(i));
    try {
      if (deleting) {
        await deleteDoc(productRef);
      } else {
        const listing = {
          ...sampleListings[i],
          image: getImageDataUrl(sampleListings[i].image),
          ownerId: credential.user.uid,
          createdAt: Date.now() - i * oneDay,
        };
        await setDoc(productRef, listing);
      }
      done++;
    } catch (error) {
      console.log(`Could not ${action} ${getListingId(i)}: ${error.code || error.message}`);
    }
  }

  console.log(`Done: ${done} of ${sampleListings.length} listings ${deleting ? 'deleted' : 'saved'}.`);
}

try {
  await run();
} catch (error) {
  console.log(`Failed: ${error.code || error.message}`);
}

process.exit(0);

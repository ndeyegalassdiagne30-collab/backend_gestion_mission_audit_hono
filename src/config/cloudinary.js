import { v2 as cloudinary } from 'cloudinary';
import 'dotenv/config';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export function uploadFichier(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'auditflow',
        resource_type: 'auto',
      },
      (erreur, resultat) => {
        if (erreur) 
            return reject(erreur);
        resolve(resultat);
      },
    );

    stream.end(buffer);
  });
}
// buffer contient les données binaires du fichier à uploader

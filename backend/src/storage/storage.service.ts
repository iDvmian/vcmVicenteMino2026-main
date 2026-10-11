import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class StorageService {
  constructor(private readonly config: ConfigService) {
    cloudinary.config({
      cloud_name: config.get('CLOUDINARY_CLOUD_NAME'),
      api_key: config.get('CLOUDINARY_API_KEY'),
      api_secret: config.get('CLOUDINARY_API_SECRET'),
    });
  }

  uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder, resource_type: 'auto' }, (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('No result from Cloudinary'));
          resolve({ url: result.secure_url, publicId: result.public_id });
        })
        .end(file.buffer);
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    const types: ('image' | 'video' | 'raw')[] = ['image', 'raw', 'video'];
    for (const resource_type of types) {
      const result = await cloudinary.uploader.destroy(publicId, { resource_type });
      if (result.result === 'ok') return;
    }
  }
}

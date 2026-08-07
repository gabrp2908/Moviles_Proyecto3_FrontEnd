import { getToken } from './api';
import { BASE_URL } from '../constants';

export const imageService = {
  uploadProfileImage: async (imageUri: string): Promise<{ imageUrl: string }> => {
    const filename = imageUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    let type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';
    if (type === 'image/jpg') type = 'image/jpeg';

    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      name: filename,
      type: type,
    } as any);

    const token = await getToken();
    const response = await fetch(`${BASE_URL}/images/profile`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Upload profile image failed:', response.status, errorText);
      throw new Error(`Upload failed: ${response.status}`);
    }

    return await response.json();
  },

  uploadChatImage: async (imageUri: string): Promise<{ imageUrl: string }> => {
    const filename = imageUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    let type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';
    if (type === 'image/jpg') type = 'image/jpeg';

    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      name: filename,
      type: type,
    } as any);

    const token = await getToken();
    const response = await fetch(`${BASE_URL}/images/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Upload chat image failed:', response.status, errorText);
      throw new Error(`Upload failed: ${response.status}`);
    }

    return await response.json();
  },

  deleteProfileImage: async (imageUrl: string): Promise<{ success: boolean }> => {
    const token = await getToken();
    const response = await fetch(`${BASE_URL}/images/profile`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl }),
    });

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.status}`);
    }

    return await response.json();
  }
};

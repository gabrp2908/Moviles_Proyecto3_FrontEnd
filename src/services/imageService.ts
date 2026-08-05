import { api } from './api';

export const imageService = {
  uploadProfileImage: async (imageUri: string): Promise<{ imageUrl: string }> => {
    const filename = imageUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      name: filename,
      type: type,
    } as any);
    
    const response = await api.post('/images/profile', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  uploadChatImage: async (imageUri: string): Promise<{ imageUrl: string }> => {
    const filename = imageUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      name: filename,
      type: type,
    } as any);
    
    const response = await api.post('/images/chat', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteProfileImage: async (imageUrl: string): Promise<{ success: boolean }> => {
    const response = await api.delete('/images/profile', {
      data: { imageUrl }
    });
    return response.data;
  }
};

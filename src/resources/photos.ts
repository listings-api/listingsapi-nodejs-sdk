import type { HttpCore } from '../types/common.js';
import type { Photo, PhotoInput } from '../types/photos.js';

export function createPhotoMethods(http: HttpCore) {
  return {
    /**
     * Get photos and media attached to a location.
     */
    async fetchLocationPhotos(locationId: string | number): Promise<Photo[]> {
      const data = await http.listingsGet(locationId, 'photos');
      return (data as any)?.data?.mediaFilesOfLocation ?? [];
    },

    /**
     * Add one or more photos to a location.
     */
    async addLocationPhotos(
      locationId: string | number,
      photos: PhotoInput[],
    ): Promise<Record<string, any>> {
      const data = await http.apiPost('locations/photos', {
        input: {
          locationId: http.encodeLocationId(locationId),
          photos,
        },
      });
      return (data as any)?.data?.addLocationPhotos ?? {};
    },

    /**
     * Remove photos from a location by photo IDs.
     */
    async removeLocationPhotos(
      locationId: string | number,
      photoIds: string[],
    ): Promise<Record<string, any>> {
      const data = await http.apiPost('locations/photos/remove', {
        input: {
          locationId: http.encodeLocationId(locationId),
          photoIds,
        },
      });
      return (data as any)?.data?.removeLocationPhotos ?? {};
    },

    /**
     * Star or unstar location photos.
     */
    async starLocationPhotos(
      locationId: string | number,
      mediaIds: string[],
      starred: boolean,
    ): Promise<Record<string, any>> {
      const data = await http.apiPost('locations/photos/star', {
        input: {
          locationId: http.encodeLocationId(locationId),
          photoIds: mediaIds,
          starred,
        },
      });
      return (data as any)?.data?.starUnstarLocationPhotos ?? {};
    },

    /**
     * Get the processing status for a bulk photo upload request.
     */
    async fetchPhotoUploadStatus(requestId: string): Promise<Record<string, any>> {
      const data = await http.apiGet(`locations/photos/requests/${requestId}`);
      return (data as any)?.data?.bulkImageProcessingStatus ?? {};
    },
  };
}

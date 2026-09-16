// Response shape from the Admin API's Gallery endpoints (GET/POST
// /galleries, DELETE /galleries/{gallery}).
export type GalleryImage = {
  uuid: string;
  original_name: string | null;
  url: string | null;
};

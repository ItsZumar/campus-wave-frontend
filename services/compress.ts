import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Image } from "react-native";

const MAX_SIDE = 1920;
const QUALITY  = 0.8;

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) =>
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject)
  );
}

export async function compressImage(uri: string): Promise<string> {
  const { width, height } = await getImageSize(uri);

  const ctx = ImageManipulator.manipulate(uri);

  if (width > MAX_SIDE || height > MAX_SIDE) {
    ctx.resize(width >= height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }

  const imageRef = await ctx.renderAsync();
  const result   = await imageRef.saveAsync({ compress: QUALITY, format: SaveFormat.JPEG });
  return result.uri;
}

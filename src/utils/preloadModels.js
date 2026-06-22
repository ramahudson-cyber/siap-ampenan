import * as faceapi from "face-api.js";

let modelsPromise = null;
const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";

export function preloadFaceModels() {
  if (!modelsPromise) {
    modelsPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    ]).catch(err => console.error("Preload model failed:", err));
  }
  return modelsPromise;
}
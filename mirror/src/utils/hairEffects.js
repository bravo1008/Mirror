// src/utils/hairEffects.js
import * as selfieSegmentation from '@mediapipe/selfie_segmentation';

let segmentation = null;

export const initSegmentation = () => {
  if (segmentation) return Promise.resolve(segmentation);

  segmentation = new selfieSegmentation.SelfieSegmentation({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
    }
  });

  segmentation.setOptions({
    modelSelection: 1, // 1 = general (better for hair), 0 = landscape
  });

  return new Promise((resolve) => {
    segmentation.onResults(() => {
      // 初始化完成
    });
    // 触发一次空推理以加载模型
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    segmentation.send({ image: canvas });
    resolve(segmentation);
  });
};

// 主函数：输入原始图像 URL，输出带效果的 DataURL
export const applyHairEffect = async (imageSrc, effectType) => {
  await initSegmentation();

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const size = Math.min(img.width, img.height);
      canvas.width = size;
      canvas.height = size;

      // 居中裁剪为人脸正方形（可选）
      const dx = (img.width - size) / 2;
      const dy = (img.height - size) / 2;
      ctx.drawImage(img, dx, dy, size, size, 0, 0, size, size);

      // 运行分割
      segmentation.send({ image: canvas }).then((results) => {
        const segMask = results.segmentationMask; // Uint8Array, 0～255

        // 创建效果画布
        const effectCanvas = document.createElement('canvas');
        effectCanvas.width = size;
        effectCanvas.height = size;
        const effectCtx = effectCanvas.getContext('2d');

        // 绘制原图
        effectCtx.drawImage(canvas, 0, 0);

        // 根据效果类型修改头发区域
        const imageData = effectCtx.getImageData(0, 0, size, size);
        const data = imageData.data;

        // 遍历每个像素
        for (let i = 0; i < data.length; i += 4) {
          const pixelIdx = i / 4;
          const maskValue = segMask[pixelIdx]; // 0=背景, 255=前景（含头发）
          
          // 假设：mask > 128 为人体（包括头发）
          if (maskValue > 128) {
            // 进一步判断是否为“头发区域”——这里简化处理：
            // 实际可结合 YUV 或 HSV 判断深色区域，但为 demo 先全局处理
            const isHairLike = data[i] < 100 && data[i + 1] < 100 && data[i + 2] < 120; // 粗略判断深色

            if (isHairLike) {
              if (effectType === 'bald') {
                // 斑秃：将头顶区域变肤色（简化：直接去色 + 透明）
                // 更真实做法：用周围皮肤颜色填充，但复杂
                // 这里用“变灰 + 降低饱和度”模拟秃顶反光
                const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
                data[i] = data[i + 1] = data[i + 2] = gray * 0.7 + 180 * 0.3; // 混合肤色
              } else if (effectType === 'thinning') {
                // 脱发：随机删除部分头发像素（模拟稀疏）
                if (Math.random() < 0.4) {
                  // 保留原色但变透明？或变浅？
                  data[i] *= 0.6;
                  data[i + 1] *= 0.6;
                  data[i + 2] *= 0.6;
                }
              } else if (effectType === 'healthy') {
                // 健康：增强光泽（提亮 + 微对比）
                data[i] = Math.min(255, data[i] * 1.2);
                data[i + 1] = Math.min(255, data[i + 1] * 1.2);
                data[i + 2] = Math.min(255, data[i + 2] * 1.2);
              }
            }
          }
        }

        effectCtx.putImageData(imageData, 0, 0);
        resolve(effectCanvas.toDataURL('image/jpeg', 0.9));
      });
    };
    img.src = imageSrc;
  });
};
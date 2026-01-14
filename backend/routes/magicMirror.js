// backend/routes/magicMirror.js
const express = require('express');
const axios = require('axios');
const FormData = require('form-data');

const router = express.Router();

// =======================
// 复用：将临时图片上传到 Cloudinary（持久化）
// =======================
async function persistImageToCloudinary(tempImageUrl) {
  if (!tempImageUrl) return "";

  const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
  const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    console.warn("⚠️ Cloudinary 未配置，无法持久化图片");
    return tempImageUrl;
  }

  try {
    const imageRes = await axios.get(tempImageUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
    });

    const formData = new FormData();
    formData.append("file", Buffer.from(imageRes.data), {
      filename: "magic_mirror.png",
      contentType: "image/png",
    });
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const uploadRes = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 60000,
      }
    );

    const permanentUrl = uploadRes.data.secure_url;
    console.log("✅ 魔法镜图片已持久化:", permanentUrl);
    return permanentUrl;
  } catch (err) {
    console.error("❌ 魔法镜图片持久化失败:", err.message || err);
    return tempImageUrl;
  }
}

// =======================
// 图生图：调用 qwen-vl-plus 实现魔法效果（✅ 使用与 dream.js 相同的解析逻辑）
// =======================
async function generateMagicMirrorImage(originalImageUrl, effect) {
  const apiKey = process.env.TYQW_API2_KEY;
  if (!apiKey) {
    throw new Error("TYQW_API2_KEY 未配置");
  }

  const effectPrompts = {
    bald: `将此人像修改为【斑秃（Alopecia Areata）】状态：
      - **核心特征**：头顶处有一块边界清晰的小的的圆形秃斑，头皮完全裸露可见
      - **细节要求**：秃斑处头皮肤质与人物原有肤色完全匹配，无色差
      - **毛发保留**：秃斑周围的头发保持完好、自然，无脱落或变形
      - **基础约束**：严格保留人物原有面部特征，无任何扭曲或修改
      - **光线要求**：光照效果与原始照片保持一致，无明暗偏差
      - **禁止项**：多余毛发、秃斑处长出毛发、头皮颜色不真实、边缘模糊、卡通风格`,

    thinning: `将此人像修改为【早期雄激素性脱发（Norwood II-III级）】状态：
      - **M型发际线显著后移**（额角退缩1.5-3cm），呈不规则锯齿状
      - **头顶头发明显稀疏**，发缝宽度增加至2-3cm，可见部分头皮
      - 整体发量减少约40%，但无完全秃斑
      - 头顶区域毛发变细（微型化），光泽减弱
      - 严格保持原脸型、肤色、表情、光照
      - 禁止：任何斑块状脱发、全秃、对称分布、卡通风格
      - 强制要求：发际线呈现自然后退，非直线切割`,

    healthy: `将此人像修改为【健康浓密头发】状态：
      - **发量饱满**，头皮几乎不可见（覆盖率>95%）
      - 发际线完整，无后移或稀疏
      - 头发有自然光泽和纹理
      - 严格保持原脸型、肤色、表情、光照
      - 禁止：任何脱发迹象、秃斑、稀疏区域`
  };

  const prompt = effectPrompts[effect];
  if (!prompt) {
    throw new Error("无效的效果类型");
  }

  try {
    const resp = await axios.post(
      "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
      {
        model: "qwen-image-edit-plus", // ✅ 关键：必须用 image-plus
        input: {
          messages: [
            {
              role: "user",
              content: [
                { image: originalImageUrl },
                { text: prompt }
              ]
            }
          ]
        },
        parameters: {
          seed: Math.floor(Math.random() * 10000),
          watermark: false
        }
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        timeout: 90000
      }
    );

    // 使用与 dream.js 相同的解析逻辑
    const choice = resp.data?.output?.choices?.[0];
    const imageField = choice?.message?.content?.find?.((x) => x.image);
    const aiImageUrl = imageField?.image;

    if (!aiImageUrl) {
      console.error("❌ AI 未返回图像。响应:", JSON.stringify(resp.data, null, 2));
      throw new Error("AI 未返回有效图像，请检查提示词或模型配额");
    }

    return aiImageUrl;
  } catch (err) {
    const errMsg = err.response?.data?.message || err.message || String(err);
    console.error("❌ AI 图生图失败:", errMsg);
    throw new Error(`生成失败: ${errMsg}`);
  }
}

// =======================
// POST /api/magic-mirror/generate
// =======================
router.post("/generate", async (req, res) => {
  const { imageUrl, effect } = req.body;

  if (!imageUrl || typeof imageUrl !== "string") {
    return res.status(400).json({ success: false, error: "原图 URL 不能为空" });
  }

  if (!effect || !["bald", "thinning", "healthy"].includes(effect)) {
    return res.status(400).json({ success: false, error: "无效的效果类型" });
  }

  try {
    // 1. 调用 AI 生成临时图片
    const tempImageUrl = await generateMagicMirrorImage(imageUrl, effect);

    // 2. 持久化到 Cloudinary
    const permanentImageUrl = await persistImageToCloudinary(tempImageUrl);

    // 3. 返回结果
    res.json({
      success: true,
      data: {
        imageUrl: permanentImageUrl
      }
    });
  } catch (err) {
    console.error("❌ 魔法镜主流程失败:", err);
    res.status(500).json({
      success: false,
      error: err.message || "服务器内部错误"
    });
  }
});

module.exports = router;
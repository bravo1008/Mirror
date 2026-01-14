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
    bald: `基于这张人脸照片，生成一张局部斑秃(alopecia areata)的新图像：
        
    【医学特征描述】
    - 斑秃类型：典型的斑块状脱发，板块没有轮廓
    - 脱发区域：头部出现1-2个不连续的脱发秃斑区域，此区域没有头发，露出头皮
    - 分布位置：通常位于头顶、枕部或颞部，不对称分布
    - 边缘特征：脱发区域边缘清晰，周围有"感叹号样"短发
    - 保留区域：仍有至少60%的头发覆盖，不是光头
        
    【视觉要求】
    - 局部秃斑：头顶、后脑勺等处有1-3个头皮暴露区域
    - 毛发状态：脱发区域皮肤光滑，无毛囊痕迹
    - 过渡自然：脱发区域与正常头发区域有一些头发渐进过渡
        
    【重要约束】
    - 保持原人物：面部特征、表情、肤色、年龄完全不变
    - 写实医疗照片风格，不要卡通化
    - 光照和阴影与原图一致
    - 皮肤纹理：秃斑区域头皮有正常皮肤纹理和毛孔
        
    【避免错误】
    - 不是整个光头
    - 不是半侧秃头
    - 脱发区域不超过头部面积的40%
    - 秃斑形状不是规则的几何图形`,

    healthy: `基于这张人脸照片，生成一张拥有健康浓密头发的新图像：
        
    【头发特征】
    - 发量：头发浓密，每平方厘米约200-250根毛发
    - 发质：头发有自然光泽，发丝强韧
    - 发色：保持自然黑发或原发色，有层次感
    - 发型：发型贴合头型，发际线自然
    - 长度：保持原本的头发长度即可
        
    【视觉细节】
    - 头皮几乎不可见（覆盖率95%以上）
    - 头发有健康的光泽反射
    - 发丝分明的细节纹理
    - 适当的头发体积和蓬松度
        
    【医学指标】
    - Norwood-Hamilton分级：I级（无脱发迹象）
    - 头皮健康：无红肿、屑屑或炎症
    - 毛囊密度：正常范围（>180根/cm²）
        
    【约束条件】
    - 保持原人物所有面部特征
    - 写实摄影风格，自然光照
    - 头发与原肤色协调
    - 不要过度美化或改变脸型`,

    thinning: `基于这张人脸照片，生成一张早期脱发（雄激素性脱发）的新图像：
        
    【脱发模式】
    - 发际线：M型后移，额角明显退缩，发际线呈现M形状，左右两侧额角头发减少
    - 头顶：头发变薄，可见部分头皮，发缝加宽
    - 整体：整体头发密度减少，但仍有连续覆盖
        
    【具体表现】
    - 额角后移：两侧额角后退1-2cm
    - 头顶稀疏：旋涡区域头发变薄，头皮隐约可见
    - 毛发直径：部分毛发变细（微型化）
    - 分布：脱发主要在前额和头顶，枕部保留
        
    【Norwood分级】
    - 符合Norwood II-III级脱发
    - 前额发际线中度后退
    - 头顶开始变薄但未完全秃顶
        
    【视觉要求】
    - 从某些角度可见头皮
    - 头发仍有一定覆盖，不是秃斑
    - 发际线呈M型，不是直线后退
    - 头顶区域头发稀疏
        
    【约束条件】
    - 保持原人物身份
    - 写实风格，医疗记录照片质感
    - 年龄适当体现（30-50岁外观）
    - 不要完全光头或大片秃斑`
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
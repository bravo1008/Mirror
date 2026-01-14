// src/components/MagicMirror.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import './MagicMirror.css';
import StarIcon from '@mui/icons-material/Star';
import mirrorImg from '../assets/mirror.png';
import Webcam from 'react-webcam';

const MagicMirror = () => {
  const [imageSrc, setImageSrc] = useState(''); // 本地预览图（base64 或 URL）
  const [uploadedImageUrl, setUploadedImageUrl] = useState(''); // 公网可访问的 Cloudinary URL
  const [originalImageUrl, setOriginalImageUrl] = useState(''); // ✅ 新增：永远保存原始图
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [magicPower, setMagicPower] = useState(0);
  const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false); // ✅ 补全
  const [appliedEffect, setAppliedEffect] = useState('');   // ✅ 补全

  const [isUploading, setIsUploading] = useState(false); // 👈 新增

  const webcamRef = useRef(null);

  // 魔力值循环
  useEffect(() => {
    const interval = setInterval(() => {
      setMagicPower(prev => (prev >= 100 ? 0 : prev + 1));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // 获取可用摄像头列表
  useEffect(() => {
    const getCameraDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setCameraDevices(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error('获取摄像头设备失败:', err);
      }
    };
    getCameraDevices();
  }, []);

  // 🔁 通用：上传 base64 或 File 到 Cloudinary
  const uploadToCloudinary = async (data) => {
    const CLOUD_NAME = 'djlvtyv8o';
    const UPLOAD_PRESET = 'lovetree';

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      throw new Error('Cloudinary 配置缺失，请检查 .env 文件');
    }

    const formData = new FormData();
    formData.append('file', data);
    formData.append('upload_preset', UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    const json = await res.json();
    if (json.error) throw new Error(json.error.message || '上传失败');
    return json.secure_url;
  };

  // 拍照
  const capture = useCallback(async () => {
    if (!webcamRef.current) {
      alert('摄像头未准备好');
      return;
    }

    const base64Image = webcamRef.current.getScreenshot();
    if (!base64Image) {
      alert('拍照失败，请重试');
      return;
    }

    try {
      setImageSrc(base64Image); // 本地预览
      const publicUrl = await uploadToCloudinary(base64Image);
      setUploadedImageUrl(publicUrl);
      setOriginalImageUrl(publicUrl); // ✅ 保存原始图
      setShowOptions(true);
      setIsCameraActive(false);
    } catch (err) {
      console.error('上传失败:', err);
      alert('图片上传失败，请重试');
    }
  }, [webcamRef]);

  // 上传图片
  const handleUploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
      setIsUploading(true);  // 👈 显示“上传中”
      try {
        setImageSrc(base64);
        const publicUrl = await uploadToCloudinary(base64);
        setUploadedImageUrl(publicUrl);
        setOriginalImageUrl(publicUrl); // ✅ 保存原始图
        setIsUploading(false); 
        setShowOptions(true);
        setIsCameraActive(false);
      } catch (err) {
        console.error('上传失败:', err);
        alert('图片上传失败，请重试');
      }
    };
    reader.readAsDataURL(file);
  };

  // 启动摄像头
  const startCamera = () => {
    setIsCameraActive(true);
    setShowOptions(false);
    setImageSrc('');
    setUploadedImageUrl('');
  };

  // 停止摄像头
  const stopCamera = () => {
    setIsCameraActive(false);
  };

  // 应用魔法效果
  const applyEffect = async (effectName) => {
    if (!originalImageUrl || isGenerating) return;

    let effectKey;
    switch (effectName) {
      case '斑秃': effectKey = 'bald'; break;
      case '脱发': effectKey = 'thinning'; break;
      case '健康': effectKey = 'healthy'; break;
      default: return;
    }
    //https://mirror-lcd5.onrender.comhttp://localhost:5000

    try {
      setIsGenerating(true);
      const response = await fetch(`https://mirror-lcd5.onrender.com/api/magic-mirror/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: originalImageUrl,
          effect: effectKey
        })
      });

      const result = await response.json();
      if (result.success && result.data?.imageUrl) {
        setImageSrc(result.data.imageUrl);
        setAppliedEffect(effectName);
        setUploadedImageUrl(result.data.imageUrl); // 更新为新图（可选）
      } else {
        throw new Error(result.error || '生成失败');
      }
    } catch (err) {
      console.error('AI 生成失败:', err);
      alert('魔法失效了...请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  // 返回默认状态
  const resetToDefault = () => {
    setIsCameraActive(false);
    setImageSrc('');
    setOriginalImageUrl(''); // ✅ 清空原始图
    setUploadedImageUrl('');
    setShowOptions(false);
    setAppliedEffect('');
  };

  // 视频约束配置
  const videoConstraints = {
    deviceId: selectedDeviceId,
    width: { ideal: 640 },
    height: { ideal: 480 },
    facingMode: "user"
  };

  return (
    <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh'}}>
      {/* 头部 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mb: 2 }}>
        <StarIcon
          sx={{
            color: '#FFD700', // ✅ 使用标准金色（更亮）
            fontSize: '2rem',
            //boxShadow: '0 0 12px rgba(255, 215, 0, 0.8), 0 0 24px rgba(255, 215, 0, 0.6)', // ✅ 加光晕
            animation: 'pulse 2s infinite alternate', // ✅ 轻微脉动
          }}
        />
        <Typography
          variant="h4"
          sx={{
            fontSize: '2.4rem',
            fontWeight: 700,
            background: 'linear-gradient(90deg, #ff6bfb, #a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block',
            lineHeight: 1,
            letterSpacing: '1px',
            whiteSpace: 'nowrap',
            //textShadow: '0 0 8px rgba(255, 255, 255, 0.4), 0 0 16px rgba(255, 107, 251, 0.6)', // ✅ 添加外发光
            //animation: 'glow 3s ease-in-out infinite alternate', // ✅ 淡入淡出光效
          }}
        >
          魔法镜子
        </Typography>
        <Box
          sx={{
            bgcolor: 'rgba(166, 120, 169, 0.3)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
           // px: 1,
            //py: 1,
            borderRadius: '12px',
            fontSize: '0.875rem',
            textAlign: 'center',
            minWidth: '70px',
            boxShadow: '0 0 10px rgba(255, 255, 255, 0.1)',
          }}
        >
          魔力值:<br />
          {magicPower}%
        </Box>
      </Box>
      <Typography
        variant="body1"
        color="#ddd"
        sx={{
          textAlign: 'center',
          mb: 4,
          fontSize: '1rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
        }}
      >
        凝视镜子，发现另一个自己...每一次魔法都是与生命的对话
      </Typography>

      {/* 镜子区域 */}
      <Box sx={{ position: 'relative', width: 270, height: 270, mb: 4 }}>
        <Paper
          elevation={6}
          sx={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(100, 0, 180, 0.3)',
            border: '2px solid #bb80ff',
            boxShadow: '0 0 20px rgba(187, 128, 255, 0.5)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* 镜框装饰（底层） */}
          <Box
            sx={{
              position: 'absolute',
              width: 120,
              height: 120,
              borderRadius: '50%',
              backgroundImage: 'linear-gradient(circle, #FFD700, #FFB347)',
              zIndex: 1,
            }}
          />

          {/* 内容区域 */}
          <Box
            sx={{
              position: 'absolute',
              width: 190,
              height: 190,
              borderRadius: '50%',
              overflow: 'hidden',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 2,
              backgroundColor: 'rgba(0,0,0,0.1)',
            }}
          >
            {isCameraActive ? (
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)',
                }}
                onUserMediaError={(err) => {
                  console.error('摄像头启动失败:', err);
                  alert('摄像头启动失败，请检查权限或设备');
                  setIsCameraActive(false);
                }}
              />
            ) : imageSrc ? (
              <img
                src={imageSrc}
                alt="Your Reflection"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  filter: 'brightness(1.1)',
                  transform: 'scaleX(-1)',
                }}
              />
            ) : (
              <img
                src={mirrorImg}
                alt="Magic Mirror"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  filter: 'brightness(1.2)',
                  animation: 'bounce 1s infinite alternate',
                }}
              />
            )}
          </Box>
        </Paper>
      </Box>

      {/* 摄像头选择 */}
      {isCameraActive && cameraDevices.length > 1 && (
        <Box sx={{ mb: 2, width: '100%', maxWidth: 400 }}>
          <Typography variant="body2" color="#ccc" sx={{ mb: 1 }}>选择摄像头：</Typography>
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            {cameraDevices.map((device, index) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `摄像头 ${index + 1}`}
              </option>
            ))}
          </select>
        </Box>
      )}

      <Typography
        color="white"
        sx={{
          mb: 2,
          fontSize: '1.6rem',
          fontWeight: 700,
          background: 'linear-gradient(90deg, #ef89ecff, #ea93ecff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          display: 'inline-block',
          lineHeight: 1,
          letterSpacing: '1px',
          whiteSpace: 'nowrap',
        }}
      >
        古老的魔法镜子正在苏醒
      </Typography>
      <Typography variant="subtitle2" color="#ccc" sx={{ textAlign: 'center', mb: 4 }}>
        凝视镜中深处，它将为你揭示发质的秘密与生命的智慧...
      </Typography>

      {/* 按钮 */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: 400 }}>
        {isCameraActive ? (
          <>
            <Button
              variant="contained"
              startIcon={<span>📷</span>}
              onClick={capture}
              disabled={isGenerating}
              sx={{
                bgcolor: '#ff4d4d',
                '&:hover': { bgcolor: '#ff1a1a' },
                fontSize: '1.2rem',
                fontWeight: 600,
                borderRadius: '20px',
                padding: '12px 24px',
              }}
            >
              拍照
            </Button>
            <Button
              variant="outlined"
              startIcon={<span>❌</span>}
              onClick={stopCamera}
              sx={{
                bgcolor: '#600080',
                color: 'white',
                '&:hover': { bgcolor: '#8000a0' },
                fontSize: '1.2rem',
                fontWeight: 600,
                borderRadius: '20px',
                padding: '12px 24px',
              }}
            >
              取消
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="contained"
              startIcon={<span>📸</span>}
              onClick={startCamera}
              disabled={isGenerating}
              sx={{
                bgcolor: '#a030e0',
                '&:hover': { bgcolor: '#c030e0' },
                fontSize: '1.2rem',
                fontWeight: 600,
                borderRadius: '20px',
                padding: '12px 24px',
              }}
            >
              拍摄倒影
            </Button>
            {imageSrc && (
              <Button
                variant="outlined"
                startIcon={<span>🔄</span>}
                onClick={resetToDefault}
                sx={{
                  bgcolor: '#303080',
                  color: 'white',
                  '&:hover': { bgcolor: '#4040a0' },
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  borderRadius: '20px',
                  padding: '12px 24px',
                }}
              >
                重置镜子
              </Button>
            )}
          </>
        )}
        <Button
          variant="outlined"
          startIcon={<span>🖼️</span>}
          component="label"
          disabled={isCameraActive || isGenerating}
          sx={{
            bgcolor: '#400080',
            color: 'white',
            '&:hover': { bgcolor: '#6000a0' },
            fontSize: '1.2rem',
            fontWeight: 600,
            borderRadius: '20px',
            padding: '12px 24px',
          }}
        >
          上传照片
          <input type="file" accept="image/*" onChange={handleUploadImage} hidden />
        </Button>
      </Box>


      {/* 上传中提示 */}
      {isUploading && (
        <Typography color="white" sx={{ mt: 3, fontStyle: 'italic', textAlign: 'center' }}>
          图片上传中······
        </Typography>
      )}

      {showOptions && imageSrc && !isGenerating && (
        <>
          <Typography variant="subtitle1" color="#fff" sx={{ mt: 3, fontWeight: 'bold' }}>
            选择要应用的效果：
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant="contained"
              onClick={() => applyEffect('斑秃')}
              sx={{
                bgcolor: '#ff6b6b',
                color: 'white',
                '&:hover': { bgcolor: '#ff4d4d' },
                borderRadius: '20px',
                padding: '8px 16px',
                fontSize: '0.9rem',
              }}
            >
              斑秃
            </Button>
            <Button
              variant="contained"
              onClick={() => applyEffect('健康')}
              sx={{
                bgcolor: '#4ecdc4',
                color: 'white',
                '&:hover': { bgcolor: '#2ab2af' },
                borderRadius: '20px',
                padding: '8px 16px',
                fontSize: '0.9rem',
              }}
            >
              健康
            </Button>
            <Button
              variant="contained"
              onClick={() => applyEffect('脱发')}
              sx={{
                bgcolor: '#f9c80e',
                color: 'black',
                '&:hover': { bgcolor: '#e6b800' },
                borderRadius: '20px',
                padding: '8px 16px',
                fontSize: '0.9rem',
              }}
            >
              脱发
            </Button>
          </Box>
        </>
      )}

      {isGenerating && (
        <Typography color="white" sx={{ mt: 3, fontStyle: 'italic' }}>
          魔法正在生效中...✨
        </Typography>
      )}
    </Box>
  );
};

export default MagicMirror;
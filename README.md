# Particle-Album

这是一个可本地部署的「**全息粒子旅行相册**」：
- 照片按 GPS 坐标贴在 3D 粒子地球（旅行地图）
- 照片按时间形成轨道环带（人生时间线）
- 支持摄像头 + 手势（捏合 / 左右挥手）切换
- 视觉风格升级为接近短视频里常见的科幻 HUD / 全息投影效果

## 当前能力

- 本地文件存储：`data/uploads`
- 元数据存储：`data/photos.json`
- API：
  - `GET /api/photos`
  - `POST /api/photos`
  - `DELETE /api/photos/:id`
- 前端效果：
  - 粒子地球 + 外层线框
  - 时间轴环带（3D Torus）
  - 地球点位 + 连接轨迹线
  - 星空背景 + 扫描线 HUD
  - 手势翻图（MediaPipe Hands）

## Windows 本地部署

```powershell
npm install
npm run dev
```

打开：`http://localhost:3000`

## 使用建议（更像你给的参考视频）

1. **先准备 GPS 与时间信息**：旅行照片导出时保留 EXIF，可批量提取。
2. **按年份批次导入**：先导入 100~300 张验证风格，再扩大规模。
3. **手势识别建议**：摄像头正前方、背景尽量干净、光线充足。
4. **上万 GPS 点优化路线**：
   - Marker 改成 `InstancedMesh`
   - 分层抽稀（LOD）
   - 把空间索引放到 Worker

## 目录结构

```text
public/      # 前端（Three.js + MediaPipe）
server.js    # Express API
data/        # 本地照片与元数据
```

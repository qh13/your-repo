-- Cloudflare D1 数据库 Schema
-- 用于存储 jable.tv 抓取的元数据

-- ============================================
-- 视频主表
-- ============================================
CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,                    -- 视频唯一 ID (来自 jable.tv URL)
    title TEXT NOT NULL,                    -- 视频标题
    description TEXT,                       -- 视频描述
    duration TEXT,                          -- 时长 (如 "12:34")
    views TEXT,                             -- 观看次数 (如 "1.2M")
    publish_date TEXT,                      -- 发布日期
    cover_url TEXT,                         -- 封面图 URL
    thumbnail_url TEXT,                     -- 缩略图 URL
    source_url TEXT NOT NULL,               -- 原始 jable.tv URL
    category TEXT,                          -- 分类
    author_name TEXT,                       -- 作者名称
    author_avatar_url TEXT,                 -- 作者头像 URL
    tags TEXT,                              -- 标签 (JSON 数组)
    stream_primary_url TEXT,                -- 主流 m3u8 URL
    stream_backup_urls TEXT,                -- 备用 URL (JSON 数组)
    stream_qualities TEXT,                  -- 清晰度 URL (JSON 对象)
    scraped_at TEXT NOT NULL,               -- 抓取时间
    updated_at TEXT NOT NULL,               -- 更新时间
    view_count INTEGER DEFAULT 0            -- 本站浏览次数
);

-- ============================================
-- 索引：提升查询性能
-- ============================================
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);
CREATE INDEX IF NOT EXISTS idx_videos_scraped_at ON videos(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_view_count ON videos(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_videos_title ON videos(title);

-- ============================================
-- 分类表（可选，方便管理）
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
    slug TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    video_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

-- ============================================
-- 操作日志表
-- ============================================
CREATE TABLE IF NOT EXISTS scrape_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_at TEXT NOT NULL,
    category TEXT,
    videos_found INTEGER,
    videos_new INTEGER,
    duration_seconds REAL,
    status TEXT,
    error_message TEXT
);

-- ============================================
-- 初始化一些分类
-- ============================================
INSERT OR IGNORE INTO categories (slug, name, description, video_count, created_at) VALUES
('uncategorized', '未分类', '未分类的视频', 0, datetime('now')),
('models', '模特', '模特视频', 0, datetime('now')),
('recent', '最新', '最新发布的视频', 0, datetime('now')),
('top', '热门', '热门视频', 0, datetime('now'));

-- ============================================
-- 创建视图：带分类名称的视频列表
-- ============================================
CREATE VIEW IF NOT EXISTS videos_with_category AS
SELECT v.*, c.name as category_name
FROM videos v
LEFT JOIN categories c ON v.category = c.slug;

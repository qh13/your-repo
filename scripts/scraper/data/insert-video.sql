-- 插入视频数据到 D1 数据库
-- video_id: dldss-460

INSERT OR REPLACE INTO videos (
    id, title, description, duration, views, publish_date,
    cover_url, thumbnail_url, source_url, category,
    author_name, author_avatar_url, tags,
    stream_primary_url, stream_backup_urls, stream_qualities,
    scraped_at, updated_at, view_count
) VALUES (
    'dldss-460',
    '视频标题待补充',  -- 标题为空，需要手动补充
    '视频描述待补充',
    '00:00',  -- 时长为空
    '0',  -- 观看次数为空
    NULL,  -- 发布日期
    '',  -- 封面图 URL 为空
    '',  -- 缩略图
    'https://jable.tv/videos/dldss-460/',
    'uncategorized',  -- 分类为空，设为未分类
    '',  -- 作者名称为空
    '',  -- 作者头像
    '["黑絲", "過膝襪", "運動裝", "肉絲", "絲襪", "眼鏡娘", "獸耳", "漁網", "水着", "校服", "旗袍", "婚紗", "女僕", "和服", "吊帶襪", "兔女郎", "Cosplay"]',  -- 标签
    'https://media-hls.saawsedge.com/b-hls-27/202927992/202927992.m3u8',  -- 主 stream URL
    '[]',  -- 备用 URL
    '{}',  -- 清晰度
    '2026-02-06T02:29:13.048Z',
    datetime('now'),
    0
);

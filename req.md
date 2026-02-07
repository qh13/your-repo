需求是，抓取自己视频网站https://jable.tv/的元数据，包括:文字，图片和视频链接，根据这些信息，创建另一个视频网站，风格可以不同，展示出原先视频网站的信息（视频文字信息和图片），视频播放时，尽量不要使用新网站的资源和流量，注意跨域问题，不能修改原先视频网站的代码，这部分的方案需要好好思考一下，目前想到的方案如下：

🧠 方案C详解：基于Cloudflare反向代理的实现
1. 核心原理
这个方案不直接让浏览器的<video>标签请求jable.tv的地址（这必然被跨域策略阻止），而是让浏览器请求您新网站域下的一个“代理接口”。

这个代理接口（由Cloudflare Worker运行）在后台“偷偷”去jable.tv获取视频数据，然后完整地转发给浏览器。对于浏览器来说，请求和响应都发生在自己的域名下，跨域问题自然消失。同时，视频数据流是“流经”Worker进行转发的，并没有占用您新站主机（如VPS）的出口带宽和流量，实现了资源节省。

2. 您需要做的具体步骤
第1步：准备Cloudflare环境

注册一个 Cloudflare 账号。（已经注册Qh13@163.com）

将您新视频网站的域名添加到Cloudflare，并按照提示更改其DNS解析服务器（这步必不可少，否则无法使用Worker）。

在控制面板中找到 “Workers” 或 “Workers & Pages” 服务，创建一个新的Worker。

第2步：编写并部署Worker代理脚本
这是最核心的一步。您需要在Worker中编写一段JavaScript代码。下方是一个基础示例，它能够代理大多数视频文件的请求。

// 部署在 Cloudflare Worker 上的代理脚本 (proxy-video.js)
export default {
  async fetch(request) {
    const url = new URL(request.url);

    // 1. 从请求路径或查询参数中，安全地提取原始视频URL
    // 例如: 您的访问链接是 https://您的新站.com/proxy/视频ID
    // Worker需要能根据“视频ID”映射或还原出真实的 jable.tv 视频地址。
    // 这里演示一个简单映射（实际需要您根据抓取的数据动态生成）
    const videoId = url.pathname.split('/').pop(); // 获取路径最后一段作为ID
    const originVideoUrl = await getOriginVideoUrl(videoId); // 您需要实现这个映射函数

    // 2. 构建一个转发到原始视频站的新请求
    let modifiedRequest = new Request(originVideoUrl, {
      headers: request.headers,
      method: request.method
    });

    // 3. 向 jable.tv 发起请求
    const response = await fetch(modifiedRequest);

    // 4. 创建新的响应，并注入关键响应头以解决跨域
    let modifiedResponse = new Response(response.body, response);
    modifiedResponse.headers.set('Access-Control-Allow-Origin', '*'); // 允许所有域名访问（安全考虑可改为您的新站域名）
    modifiedResponse.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    // 重要：保持原站返回的 Content-Type，浏览器才能正确识别为视频
    // 如果原站返回了 Range 相关的头，也一并保留，以支持视频拖拽

    return modifiedResponse;
  }
};

// 示例映射函数（此处需您根据抓取的数据自行完善）
async function getOriginVideoUrl(videoId) {
  // 这里应该是您的逻辑：根据 videoId 从数据库、KV存储或API中查询出真实的 jable.tv 视频链接。
  // 例如: return `https://jable.tv/videos/${videoId}/index.m3u8`;
  // 或者直接返回一个固定的视频链接用于测试。
  return `REAL_VIDEO_URL_FROM_JABLE.TV`;
}

第3步：在新网站前端调用代理
您新网站的后端（如Node.js, PHP等）在渲染视频播放页面时，不再直接输出jable.tv的原始视频链接，而是输出指向您Worker的代理链接。

<!-- 新站前端页面示例 -->
<video controls preload="metadata" width="100%">
  <!-- src 指向您部署的 Cloudflare Worker 地址 -->
  <source src="https://您的worker子域名.workers.dev/proxy/视频唯一ID" type="video/mp4">
  <!-- 或者，如果您为Worker绑定了自定义域名 -->
  <source src="https://video-proxy.您的新站域名.com/proxy/视频唯一ID" type="video/mp4">
  您的浏览器不支持 video 标签。
</video>

第4步：完善与优化

安全与限制：在上面的示例代码中，Access-Control-Allow-Origin: * 是宽松的设置。正式环境下，建议设置为 您的新站域名（如 https://www.your-new-site.com）。同时，可以在Worker中加入鉴权或签名验证，防止代理被他人滥用。

性能与缓存：可以在Worker中为视频响应设置缓存头（如Cache-Control: public, max-age=86400），让Cloudflare的边缘节点缓存视频片段，显著提升全球访问速度和减少回源请求。

处理流媒体：如果原站使用HLS（.m3u8）或DASH（.mpd）流，代理需要能够正确处理这些清单文件以及其中的分片（.ts）请求。这要求Worker能动态地重写清单文件内的链接。

存储映射关系：示例中的 getOriginVideoUrl 函数是关键。您需要将抓取到的视频元数据（标题、封面、原始播放链接）存入数据库。当新站需要播放时，通过视频ID查询出原始链接，并传递给Worker使用。Cloudflare自身的 KV 存储非常适合用于这种快速的键值映射。

已经申请域名：
sexxyvideo.dpdns.org

已经申请远程服务器
ip:39.106.128.85
username:root
password:4818866le!

源视频格式是:m3u8
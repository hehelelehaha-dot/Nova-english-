# 学习时长云同步（Firebase）

Nova 英语是静态 GitHub Pages 站点，没有自己的服务器。累计时长用 **Firebase Authentication + Cloud Firestore** 同步：网页直接加载 Firebase 的 CDN 脚本，按登录用户各存一份，不经过额外后端。

仓库里没有 Supabase。Firebase 的网页配置本来就会出现在浏览器里，所以 `firebase-config.js` 可以提交；真正拦住别人的是 `firestore.rules`（每人只能读写自己的 `users/{uid}` 文档）。

只同步 `nova_time`（每一天的秒数，首页「累计时长」是这些天的总和）。整理、复习进度、☀ 重点句、分板块时长都不上传。

合并规则和同步码里的 `t:log` 相同：**同一天取较大值**。新的秒数要比原来多出 0.5 秒以上，才会盖过那一天。不会把已经记下的时间变少。退出登录也不会清掉这台设备上的时长。

## Nova 要做的事

1. 打开 [Firebase console](https://console.firebase.google.com/)，新建一个项目（例如 `nova-english`）。
2. **Build → Authentication → Get started**。在 **Sign-in method** 里打开：
   - **Google**
   - **Email/Password**（只要邮箱和密码，不用邮件链接）
3. **Authentication → Settings → Authorized domains**，加上 `hehelelehaha-dot.github.io`。`localhost` 一般已经在列表里。
4. **Build → Firestore Database → Create database**。选生产模式，地区选离你近的（例如 `asia-east1`）。
5. **Project settings（齿轮）→ Your apps → Add app → Web**。把给出的 `firebaseConfig` 填进仓库根目录的 `firebase-config.js`，替换所有 `YOUR_…`。字段名保持不动。不要把服务账号 JSON、私钥放进仓库。
6. 部署安全规则（二选一）：
   - 装 [Firebase CLI](https://firebase.google.com/docs/cli)，在仓库根目录执行：
     ```bash
     firebase login
     firebase use --add
     firebase deploy --only firestore:rules
     ```
   - 或者打开 **Firestore → Rules**，把 `firestore.rules` 的内容整段贴进去，发布。
7. 把站点推到 GitHub Pages。打开 App，在首页「累计时长」旁边点 **☁ 登录**，或到 **⚙︎ 设置 → 学习时长云同步**。用 Google 或邮箱注册/登录。另一台设备用同一个账号登录后，两边的累计时长会合成一份。

没填配置、或还没登录时，计时和以前一样，只写在这台设备的 `localStorage` 里。

## 数据长什么样

```
users/{uid}
  nova_time: { "2026-11-02": 123.4, "2026-11-01": 80 }
  updatedAt: 1730000000000
```

文档 ID 是 Firebase 用户的 uid，不是大家共用的一个匿名文档。

## 什么时候上传

- 登录之后马上拉取，按上面的规则合并，如果本地某一天更长，再写回云端。
- 学习中大约每 3 分钟上传一次，停手后大约 45 秒再补一次。
- 切到后台、或重新打开页面时再同步一次。
- 设置里可以点「立即同步」。

这样不会每一秒都连网。

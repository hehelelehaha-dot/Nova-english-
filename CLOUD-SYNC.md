# 学习时长云同步（Firebase）

Nova 英语是静态 GitHub Pages 站点，没有自己的服务器。累计时长和 ④ 今天的句子听写用 **Firebase Authentication + Cloud Firestore** 同步：网页直接加载 Firebase 的 CDN 脚本，按登录用户各存一份，不经过额外后端。

仓库里没有 Supabase。Firebase 的网页配置本来就会出现在浏览器里，所以 `firebase-config.js` 可以提交；真正拦住别人的是 `firestore.rules`（每人只能读写自己的 `users/{uid}` 文档）。

同步两份数据，都在登录用户自己的 `users/{uid}` 文档里：

- `nova_time`：每一天的秒数。首页「累计时长」是这些天的总和。
- `nova_dq`：④ 句子听写今天这条进度。键是本地日历日 `YYYY-MM-DD`，和「今天时长」用的是同一个 `dKey()`。

整理、复习进度、☀ 重点句、分板块时长都不上传。退出登录也不会清掉这台设备上的时长或听写进度。

### 累计时长

合并规则和同步码里的 `t:log` 相同：**同一天取较大值**。新的秒数要比原来多出 0.5 秒以上，才会盖过那一天。不会把已经记下的时间变少。

### ④ 今天的句子

只合并同一个 `YYYY-MM-DD`。另一天的进度留在原来的那一天。

- **选中 `sel`：并集。** 目标仍然是选中的句数。手机选了 3 句、iPad 又选了另外 2 句，合并之后是 5 句，进度是 n/5。每台设备保留自己的选择顺序，另一台多出来的句子补在后面。
- **写对 `done`：并集。** 只要有一台设备记过「整句对了」，这个句子 id 就会留下。没出现在 `sel` 里的写对记录也留着；之后再选中，仍然算已经写对。
- **超额 `extra`：取较大值。** 两边的超额不相加，同一次复查不会被算成两次，已经记下的超额也不会变少。这一天还没写满时，超额先存着，写满后再显示。

因此：已经同步过的句子，如果另一台设备上还选着，在这边取消选择，下次合并还会把它加回来。要少选，就在这次同步之前取消。写对的标记不跟着取消一起消失。

没登录或没网时，选择和「整句对了」只写在这台设备的 `nova_dq` 里。本地过了零点以后，上一天还在 `nova_dq_log` 里，下次连上再上传，不会拿空白的新一天去盖掉云端的昨天。

## Nova 要做的事

线上项目已经是 `nova-eneglish`（id 就是这个拼写），Firestore 在 `nam5`。下面是当初建项目的步骤；现在不用再建一个项目。规则有更新时，把仓库里的 `firestore.rules` 再发布一次即可。

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
7. 把站点推到 GitHub Pages。打开 App，在首页「累计时长」旁边点 **☁ 登录**，或到 **⚙︎ 设置 → 学习时长和今天听写**。用 Google 或邮箱注册/登录。另一台设备用同一个账号登录后，两边的累计时长和当天的句子听写会各自合成一份。

没填配置、或还没登录时，计时和今天的听写都和以前一样，只写在这台设备的 `localStorage` 里。

## 数据长什么样

```
users/{uid}
  nova_time: { "2026-11-02": 123.4, "2026-11-01": 80 }
  nova_dq: {
    "2026-11-03": {
      sel: ["dt_naval_t11:2", "dt_naval_t11:5"],
      done: ["dt_naval_t11:2"],
      extra: 0
    }
  }
  updatedAt: 1730000000000
```

文档 ID 是 Firebase 用户的 uid，不是大家共用的一个匿名文档。句子 id 和听写页里的一样：`题目 id:句子下标`。

这次写入仍然会带上 `nova_time`（一个 map）。已经发布的旧规则只要求 `nova_time` 是 map，所以会接受多出来的 `nova_dq`。仓库里的 `firestore.rules` 现在把 `nova_dq` 也写明了。有空时再发布一次规则，让控制台和仓库一致：

```bash
firebase deploy --only firestore:rules
```

## 什么时候上传

- 登录之后马上拉取，按上面的规则合并。时长是本地某一天更长才写回；听写是本地有云端还没有的选中句子、写对记录或更大的超额才写回。
- 学习中大约每 3 分钟上传一次，停手后大约 45 秒再补一次。
- 切到后台、或重新打开页面时再同步一次。
- 设置里可以点「立即同步」。

这样不会每一秒都连网。

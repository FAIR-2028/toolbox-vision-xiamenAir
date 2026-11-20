# v1.2 项目基线（第一、第二阶段审计）

项目：E:\toolbox-vision-demo。依据：用户上传 v1.2 工作包。未重建项目，未覆盖业务代码。

## 当前证据

- Git：git status、branch、log 均返回 not a git repository；未执行 git init 或创建分支。
- Magpie Gate A：通过，见 MAGPIE_GATE_A_V1.2.json。新 Codex/Pi 请求都经 demo / api.lk888.ai / tt-6.1-sol，Usage HTTP 200。
- Herdr 0.9.5：Codex integration current(v10)，Pi current(v9)。
- Gate B：未通过，三个工作 Pane 尚待建立；当前 HERDR_ENV 为空。等待用户授权仅从外部操作专用 toolbox-v12 会话的技能例外。
- 本轮尚未重跑构建或浏览器测试；旧版测试结果不作为本轮 v1.2 通过证明。
- .gitignore 已包含 .env、.env.* 并保留 .env.example 例外。未读取认证内容。

## 与 v1.2 的差异，后续增量处理

- 当前清单套筒为 9、总数为 53；v1.2 工作包清单为套筒8、总数52。需按唯一依据统一，不在第一、二阶段直接改写。
- 当前四场景为完整、缺套筒、缺大号手柄、缺小号手柄；v1.2 规定完整、缺套筒、缺3批头、缺长延长杆。保留现有照片与配置，后续增量适配，不覆盖用户资产。
- 当前入口 app/page.tsx 重定向到 public/inspection.html。
- 当前尚无统一的 Mock/Qwen/Algorithm Provider Registry；不得认定 Gate C 完成。
- Docker Compose 配置存在不等于容器验收成功；Gate D 待实际 docker info 与 compose up 验证。

## 当前文件指纹

| 文件 | 字节 | SHA-256 |
|---|---:|---|
| `package.json` | 706 | `15af768ae9850f50c28199ff0d633ba32064e0fe776589890e57ff827842f05e` |
| `package-lock.json` | 70618 | `41541781c4d9927d9cbf4fcf0b70fd435109b859a6f0d80b6c17ee63b49f2748` |
| `app/page.tsx` | 104 | `5b696b1bcd8b4709335db3c839e4b90bff4108552fc64e5433f6b80d1f329c12` |
| `public/inspection.html` | 51023 | `2a5f17145914b9c78ec671f019356e1614c67f0c07dbf3e15d4cc5931a5e5458` |
| `app/api/analyze/route.ts` | 1938 | `3816b9c8097adf37b6c24890bc012ac8808c7c981625a9bf291d09cd0c6f8b2f` |
| `lib/mock.ts` | 1527 | `538814e7b5072d28eeb3ec4cc584eca0ad314151b36f4ea132a4a73a801c1ba0` |
| `config/tool_inventory.json` | 2073 | `310911bd840b0272318e6263ff2864c1d14ed38081b3576cabbf6c1fa89ec531` |
| `config/mock_scenarios.json` | 2405 | `6cdd6b1bf5d1a6febf272beb40ed83038448590b183398ed523a54a5de925740` |
| `Dockerfile` | 488 | `f0ab07dce515ce570192f46eee6eb4c0ae64e3174fbc6280ca24170c7e39d5e9` |
| `docker-compose.yml` | 449 | `84c500e62150e374a4386f3b3dd407050add923c97231e2501ba0018bad41b5d` |
| `.gitignore` | 95 | `4cee2536680efcb8a1a015f8448131902504a304930dc17cd11f30ec0b39a29c` |

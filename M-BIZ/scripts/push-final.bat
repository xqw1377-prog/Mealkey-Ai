@echo off
cd /d "C:\Users\xqw13\Mealkey Agent"

:: M-ED
echo === feature/m-ed ===
git checkout -b feature/m-ed
git rm -r --cached -q .
git checkout master -- package.json tsconfig.json turbo.json .gitignore .env.example README.md
git checkout master -- packages/agent-sdk/ packages/agent-runtime/
git checkout master -- apps/web/src/server/services/m-ed.service.ts
git checkout master -- apps/web/src/lib/equity.ts
git checkout master -- docs/M_ED_*.md
git add -A
git commit -m "M-ED Agent - 组织股权设计引擎"
git push -u origin feature/m-ed --force
git checkout master
git branch -D feature/m-ed

:: M-BIZ
echo === feature/m-biz ===
git checkout -b feature/m-biz
git rm -r --cached -q .
git checkout master -- package.json tsconfig.json turbo.json .gitignore .env.example README.md
git checkout master -- packages/agent-sdk/ packages/agent-runtime/
git checkout master -- apps/web/src/server/services/m-biz-client.ts apps/web/src/server/services/m-biz.service.ts
git checkout master -- apps/web/src/lib/business.ts
git checkout master -- docs/M_BIZ_*.md
git add -A
git commit -m "M-BIZ Agent - 商业模式工作台"
git push -u origin feature/m-biz --force
git checkout master
git branch -D feature/m-biz

echo === All done! ===

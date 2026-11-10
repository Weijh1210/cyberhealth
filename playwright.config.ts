import {defineConfig} from '@playwright/test';
const port=process.env.PLAYWRIGHT_PORT??'4173';
const baseURL=`http://127.0.0.1:${port}`;
export default defineConfig({
 testDir:'./tests/e2e',fullyParallel:false,workers:1,timeout:45000,
 use:{launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE},baseURL,timezoneId:'Asia/Shanghai',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'desktop',use:{viewport:{width:1440,height:1000}}},{name:'mobile',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}}],
 webServer:{command:`next start -H 127.0.0.1 -p ${port}`,url:baseURL,reuseExistingServer:false,timeout:30000},
});

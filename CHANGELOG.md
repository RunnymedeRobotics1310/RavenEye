## [3.48.1](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.48.0...v3.48.1) (2026-04-20)


### Bug Fixes

* ⏺ Topology fixed per the official 2025 FRC manual figure 13-1. The connector lines route to the same source/destination matches, just into the correct halves now — so placeholders before teams arrive and the final team positions will agree. ([7c58b25](https://github.com/RunnymedeRobotics1310/RavenEye/commit/7c58b25569b769e0900fed897e63cce71c4596bc))
* Render error first time viewing event on kiosk page ([df136f4](https://github.com/RunnymedeRobotics1310/RavenEye/commit/df136f4c895b091f1267bdda132a27878a8a7f48))
* Resize bracket for championship matches ([9116a98](https://github.com/RunnymedeRobotics1310/RavenEye/commit/9116a9897ffa99726dcda5da840db8679ab90147))
* Show 4th team in kiosk page ([a30bfac](https://github.com/RunnymedeRobotics1310/RavenEye/commit/a30bfac843d0366f5579b23e2ee02b8c17137fb0))

# [3.48.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.47.1...v3.48.0) (2026-04-19)


### Features

* add cacheFetch + syncConfig + migrate high-value GETs (Unit 3, client) ([fa13235](https://github.com/RunnymedeRobotics1310/RavenEye/commit/fa13235316f83970991c420fdbb5f6791d3b5462)), closes [hi#value](https://github.com/hi/issues/value)
* add centralized clock-skew tolerance module (Unit 2) ([4c7fc66](https://github.com/RunnymedeRobotics1310/RavenEye/commit/4c7fc6607d7b7e732ffcd834c901f6eeb3a88c08))
* online indicator from lastOk + tight liveness qualifier (Unit 8, client) ([36ae95d](https://github.com/RunnymedeRobotics1310/RavenEye/commit/36ae95da1e3b973fdc986dc44d2385282fb5ed62))
* reports-in-IndexedDB infrastructure + metadata sync job (Unit 6, client) ([ab53525](https://github.com/RunnymedeRobotics1310/RavenEye/commit/ab535250913b5b51755d0b30e23a8793efe5fc94))
* role-fingerprint detection + cache lifecycle on login/logout (Unit 7, client) ([3807446](https://github.com/RunnymedeRobotics1310/RavenEye/commit/3807446ff5a57e48c0fb2d652bbe2f64e6ab218c))
* tournament-window helper + sync.ts ACTIVE_TOURNAMENT_CUTOFF removal (Unit 4) ([d5f33f9](https://github.com/RunnymedeRobotics1310/RavenEye/commit/d5f33f9ae5334b2c09ee27702cbb27f9981f7181))
* two-loop sync scheduler + JOBS registry (Unit 5) ([4380364](https://github.com/RunnymedeRobotics1310/RavenEye/commit/438036496dca599e45cce647d9e85ec6bef15d3f))

## [3.47.1](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.47.0...v3.47.1) (2026-04-19)


### Bug Fixes

* Auto-fill tba codes ([5b60d4e](https://github.com/RunnymedeRobotics1310/RavenEye/commit/5b60d4eea479d0398d14c2bd11cd54243f58b6ed))

# [3.47.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.46.1...v3.47.0) (2026-04-19)


### Features

* Match video sync from TBA ([7ad8aa3](https://github.com/RunnymedeRobotics1310/RavenEye/commit/7ad8aa3e449fddca1eb8fd07bc3c3b36f0f55a38))

## [3.46.1](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.46.0...v3.46.1) (2026-04-18)


### Bug Fixes

* Include rank in schedule page beside team ([68976e1](https://github.com/RunnymedeRobotics1310/RavenEye/commit/68976e124b4fbf338f60b16042c896256b163658))

# [3.46.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.45.4...v3.46.0) (2026-04-18)


### Features

* **tba:** admin UI for TBA event-key overrides ([9cb5da7](https://github.com/RunnymedeRobotics1310/RavenEye/commit/9cb5da7b8f16df9efc5563e28da36c17772db79a))
* **tba:** P0 — TBA data foundation and webcast sync ([87e8ad7](https://github.com/RunnymedeRobotics1310/RavenEye/commit/87e8ad73570c369b27cf5e074f84da8321ebd0e4))
* **tba:** show webcast source badges + staleness banner on admin streams page ([4c67564](https://github.com/RunnymedeRobotics1310/RavenEye/commit/4c67564a232891fc5ae7663e7fdf18a925e257d5))

## [3.45.4](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.45.3...v3.45.4) (2026-04-18)


### Bug Fixes

* Don't clear schedule on connectivity break ([780ff95](https://github.com/RunnymedeRobotics1310/RavenEye/commit/780ff95ff6853246251a26606cf3d5cc7d2bbb3e))

## [3.45.3](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.45.2...v3.45.3) (2026-04-18)


### Bug Fixes

* add tba key to placeholder ([1f365b3](https://github.com/RunnymedeRobotics1310/RavenEye/commit/1f365b3c1052b6ddc558a18e6292fa1d55beae0b))

## [3.45.2](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.45.1...v3.45.2) (2026-04-18)


### Bug Fixes

* Kiosk view to use 12h clock ([9c08e5f](https://github.com/RunnymedeRobotics1310/RavenEye/commit/9c08e5f2bb4a4261d739c09727250999fc32311e))

## [3.45.1](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.45.0...v3.45.1) (2026-04-17)


### Bug Fixes

* auto-sync tracking data reads shared networkHealth instead of pinging ([f2c3e48](https://github.com/RunnymedeRobotics1310/RavenEye/commit/f2c3e48dd5f77c26aa9b2a35e65d408a6c19744e))
* harden track forms, auto-sync events every 15s, show unsync counts ([b2be8ec](https://github.com/RunnymedeRobotics1310/RavenEye/commit/b2be8ec69560b575fb26805a416e193e4d3b12b9))
* route remaining ping() callers through shared networkHealth ([397a567](https://github.com/RunnymedeRobotics1310/RavenEye/commit/397a56740bfe551fd4c747f8df09b3352f1a17a0))

# [3.45.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.44.0...v3.45.0) (2026-04-17)


### Features

* Network status indicator ([634441c](https://github.com/RunnymedeRobotics1310/RavenEye/commit/634441cf73c6f7446203c0c8dccaafeb27523c44))

# [3.44.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.43.1...v3.44.0) (2026-04-17)


### Features

* add programming data section and pit kiosk clock ([07820c6](https://github.com/RunnymedeRobotics1310/RavenEye/commit/07820c6492483e8f47a522a9044e49d93b2c38cd))

## [3.43.1](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.43.0...v3.43.1) (2026-04-17)


### Bug Fixes

* Remove practice matches from futrue event schedule ([02c6b7f](https://github.com/RunnymedeRobotics1310/RavenEye/commit/02c6b7fc411e38614105e296c376311f0de60a58))

# [3.43.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.42.3...v3.43.0) (2026-04-17)


### Features

* corner instruction table on calibration page ([202c6d8](https://github.com/RunnymedeRobotics1310/RavenEye/commit/202c6d83f854829faa4c5aaf10378ac42d330213))
* field map calibration stage 1 frontend ([d882451](https://github.com/RunnymedeRobotics1310/RavenEye/commit/d8824510df14f309f67a096aa3f9bba397742cb7))

## [3.42.3](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.42.2...v3.42.3) (2026-04-16)


### Bug Fixes

* Simultaneous active tournament picker ([8ed744c](https://github.com/RunnymedeRobotics1310/RavenEye/commit/8ed744c1ac26cb934238e9d754fc7edafa5f75ec))

## [3.42.2](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.42.1...v3.42.2) (2026-04-16)


### Bug Fixes

* Show practice matches in kiosk ([56f89cd](https://github.com/RunnymedeRobotics1310/RavenEye/commit/56f89cd8f4ecd59cfb49e83c9d03d3584a1cc6ea))

## [3.42.1](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.42.0...v3.42.1) (2026-04-16)


### Bug Fixes

* remove pitscout button and add match strat to expert scouts ([78bb795](https://github.com/RunnymedeRobotics1310/RavenEye/commit/78bb795ae43480f0f93c7f798f46cdf50a59f7b5))
* Remove scout button and add match strat button ([3349b07](https://github.com/RunnymedeRobotics1310/RavenEye/commit/3349b077ac0c306d97dd5c71864dafc1597965fb))

# [3.42.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.41.0...v3.42.0) (2026-04-15)


### Features

* Bar chart support ([95e618e](https://github.com/RunnymedeRobotics1310/RavenEye/commit/95e618e666fcefe4b1bdfecaf40af04f993ba9d1))

# [3.41.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.40.3...v3.41.0) (2026-04-11)


### Features

* PMVA updates and Robot Performance Report ([0ef7abd](https://github.com/RunnymedeRobotics1310/RavenEye/commit/0ef7abdad245c5c50b011bae827c01c7a8125797))

## [3.40.3](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.40.2...v3.40.3) (2026-04-10)


### Bug Fixes

* Better typeahead styling ([bad81db](https://github.com/RunnymedeRobotics1310/RavenEye/commit/bad81dbf576f509b64ea4bb6014e2920a89d3f18))
* CSS consolidation ([6531c30](https://github.com/RunnymedeRobotics1310/RavenEye/commit/6531c306eced98118f919e34d39918b90f71c880))
* Title bar was clipping ([da683f6](https://github.com/RunnymedeRobotics1310/RavenEye/commit/da683f60bbfb720963102cf83c42fad3e640ec73))
* Type ahead on match videos page ([60e7e8f](https://github.com/RunnymedeRobotics1310/RavenEye/commit/60e7e8f23eda60ac75971148774499998825705d))

## [3.40.2](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.40.1...v3.40.2) (2026-04-10)


### Bug Fixes

* Consolidate tournament selection/navigation, removing over 1000 lines of code ([6d2a617](https://github.com/RunnymedeRobotics1310/RavenEye/commit/6d2a617ea52a86261b81cd58664228561b385e00))
* reorder reports on report home page ([4be4215](https://github.com/RunnymedeRobotics1310/RavenEye/commit/4be4215662a523882b71a504403dd564b74676d2))

## [3.40.1](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.40.0...v3.40.1) (2026-04-09)


### Bug Fixes

* Display numbers on bar chart ([e8f5da2](https://github.com/RunnymedeRobotics1310/RavenEye/commit/e8f5da2f08ee2bb7f70c19dbd617b65eae09e4a9))
* Reorder track cards ([1037237](https://github.com/RunnymedeRobotics1310/RavenEye/commit/1037237fa22b5877e508bccfaa5bddf555ebfd2d))
* Sequence report cleanup ([a1b4ad3](https://github.com/RunnymedeRobotics1310/RavenEye/commit/a1b4ad37fe6edd2f5078c69e4e489912fd414e68))
* Sequence report cleanup ([ae8170d](https://github.com/RunnymedeRobotics1310/RavenEye/commit/ae8170d233d9770f63bdcfed3d8d31ef9ea7eb35))
* Sequence report cleanup ([0e9d11f](https://github.com/RunnymedeRobotics1310/RavenEye/commit/0e9d11f6ec66274006d57377062f634721ddfeb7))

# [3.40.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.39.1...v3.40.0) (2026-04-08)


### Bug Fixes

* Remove embedded youtube player on PMVA page ([57e4e7a](https://github.com/RunnymedeRobotics1310/RavenEye/commit/57e4e7a2ba76699e79377ecc325776d39a3ea883))


### Features

* Introduce DRIVE TEAM role to have read-only access to match strategy ([4cade55](https://github.com/RunnymedeRobotics1310/RavenEye/commit/4cade55f2daeb0dba438a0f5ae54969429e1e3b0))
* Pinch to zoom on desktop support for strategy drawing ([4d6eaa8](https://github.com/RunnymedeRobotics1310/RavenEye/commit/4d6eaa80a901dd9cae142752f7cda4d2ad530035))
* Refresh token stored in local storage ([5ae04af](https://github.com/RunnymedeRobotics1310/RavenEye/commit/5ae04af0141dff8789da264f50fc69f42a503d6c))

## [3.39.1](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.39.0...v3.39.1) (2026-04-06)


### Bug Fixes

* Fix word wrap on home page due to url length ([a08b7ff](https://github.com/RunnymedeRobotics1310/RavenEye/commit/a08b7ff8a66da64d1e7acc7db01aa217b3303814))

# [3.39.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.38.4...v3.39.0) (2026-04-06)


### Bug Fixes

* Add support for arrows and lines ([c6e243f](https://github.com/RunnymedeRobotics1310/RavenEye/commit/c6e243f808e3cb38e1a0dce75e903ecabd5d1da8))
* allow admins to see this section ([de57f58](https://github.com/RunnymedeRobotics1310/RavenEye/commit/de57f58a0974cb575733df9aa29ab9c1928f1e2d))
* Better colors ([fdd4224](https://github.com/RunnymedeRobotics1310/RavenEye/commit/fdd422404372d39f053629446536d8a6e4c2c8da))
* consolidate play/stop ([4e06f09](https://github.com/RunnymedeRobotics1310/RavenEye/commit/4e06f093d35918914c1a593674c5fee6ee94d348))
* css cleanup ([a675e5f](https://github.com/RunnymedeRobotics1310/RavenEye/commit/a675e5f8ffa991dae6bf4c96624a16858b4f3f86))
* field edit only available in full screen mode ([843e54a](https://github.com/RunnymedeRobotics1310/RavenEye/commit/843e54ad24eab09e7249e6b9df462a532ff07af3))
* fix arrowhead ([105bdb1](https://github.com/RunnymedeRobotics1310/RavenEye/commit/105bdb116f4a33849d26fa1a3246893d3a6e55cc))
* get rid of lock state - always editable if privs exist ([ad2ad36](https://github.com/RunnymedeRobotics1310/RavenEye/commit/ad2ad361fe606bae3eb021589916e0d77cc94353))
* hide pan button on touch devices ([33dc535](https://github.com/RunnymedeRobotics1310/RavenEye/commit/33dc535b69103407aceb259fb1420b3f6e55b996))
* hide title if toolbar wraps in full screen mode ([4efe8a3](https://github.com/RunnymedeRobotics1310/RavenEye/commit/4efe8a3149b99d6c3deecb012296c0b0ad0e5991))
* Image resizing ([e1d2b74](https://github.com/RunnymedeRobotics1310/RavenEye/commit/e1d2b749ec36b308d9a1379dd03a67e93bbddd6c))
* layout and zoom fixes ([eb97375](https://github.com/RunnymedeRobotics1310/RavenEye/commit/eb97375bf54b128b711c0754867beb542a4bdcbf))
* layout and zoom fixes ([a83403f](https://github.com/RunnymedeRobotics1310/RavenEye/commit/a83403f8ef6ee593bfaf9d58d655c79f7d6e2f3f))
* More concise sync demo ([23de7d9](https://github.com/RunnymedeRobotics1310/RavenEye/commit/23de7d9ba393e62a27529f2a8c781acb37b86cd2))
* move close icon ([2fe4527](https://github.com/RunnymedeRobotics1310/RavenEye/commit/2fe45275980ad0479c653e5419b55780c1d4d6c4))
* Pan arrowhead fix ([46e5608](https://github.com/RunnymedeRobotics1310/RavenEye/commit/46e5608fae56da749561c77022e81e32355f730c))
* pan/zoom controls ([69e2f86](https://github.com/RunnymedeRobotics1310/RavenEye/commit/69e2f86bb2292f8337716e30935c65f1f5506475))
* Plan sync timing fix ([80143b4](https://github.com/RunnymedeRobotics1310/RavenEye/commit/80143b4a4faae865c1127efad51ed51a85437a85))
* Rotate cavas ([19120bc](https://github.com/RunnymedeRobotics1310/RavenEye/commit/19120bc5e65b083c6edfded452f1461c3c32f263))
* Rotate cavas with offset ([4dd9228](https://github.com/RunnymedeRobotics1310/RavenEye/commit/4dd9228ced3fe9fdf155d6c9c7e5424004bdf22f))
* standardize font sizes for strat page ([0379efb](https://github.com/RunnymedeRobotics1310/RavenEye/commit/0379efb815b75531b29924f75a3e2e10d3e3ecf8))
* Sync messaging ([58c9de2](https://github.com/RunnymedeRobotics1310/RavenEye/commit/58c9de265a76bf318fa544227716d2f0b616ee2f))
* Toggle team strokes ([8b34562](https://github.com/RunnymedeRobotics1310/RavenEye/commit/8b34562a483c2a2c4f300d1d48217f6be20a365a))
* Toolbar enhancements ([6159338](https://github.com/RunnymedeRobotics1310/RavenEye/commit/6159338c6d305b34342390a1c5cf0d2ddc4d5bad))
* Toolbar tweaks ([8f1f2f7](https://github.com/RunnymedeRobotics1310/RavenEye/commit/8f1f2f7cbf47a9210bed42ca8cb06c96280f7c8f))
* Toolbar tweaks ([e925170](https://github.com/RunnymedeRobotics1310/RavenEye/commit/e9251706766929b3f227ffde1d69a3a0ebbbbfa6))
* Toolbar tweaks ([41f846a](https://github.com/RunnymedeRobotics1310/RavenEye/commit/41f846acfb0f81c1cc6f310b79fee986654b19c6))
* Toolbar tweaks ([88672d9](https://github.com/RunnymedeRobotics1310/RavenEye/commit/88672d9afb397820ab4f13b228c31995e3734b31))


### Features

* Match strategy canvas ([c075045](https://github.com/RunnymedeRobotics1310/RavenEye/commit/c075045b75bb79252962a29ac16d0a604aefff5d))

## [3.38.4](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.38.3...v3.38.4) (2026-03-30)


### Bug Fixes

* reorder schedule page ([25a94d7](https://github.com/RunnymedeRobotics1310/RavenEye/commit/25a94d792c883cde062692e36fdfc146e0024cc1))

## [3.38.3](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.38.2...v3.38.3) (2026-03-30)


### Bug Fixes

* deploy properly-versioned artifact ([0aa345f](https://github.com/RunnymedeRobotics1310/RavenEye/commit/0aa345f70c88bd3313b72dd4af1cdb6a259b180c))

## [3.38.2](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.38.1...v3.38.2) (2026-03-30)


### Bug Fixes

* Alliance colors on svg ([c6f528c](https://github.com/RunnymedeRobotics1310/RavenEye/commit/c6f528c0a2cb7ee4c7856b95ab5376d6fea4dfda))
* Better bracket formatting ([bf8ccfa](https://github.com/RunnymedeRobotics1310/RavenEye/commit/bf8ccfa038acb8eab997c7f69fa58dff95fd9ad7))
* better html security fix ([3274620](https://github.com/RunnymedeRobotics1310/RavenEye/commit/3274620caea246addcd0bee17ed4ef1e6bb0f05a))
* Clean up kiosk and schedule views to share the bracket ([34dc46c](https://github.com/RunnymedeRobotics1310/RavenEye/commit/34dc46ca5a27abe88847cfe1f8ad8012f4c788b1))
* Finals alignment ([f1b02a8](https://github.com/RunnymedeRobotics1310/RavenEye/commit/f1b02a82575fbaf514ee1cc7cabd75d1ef28cfec))
* Highlight owner team ([bdcbefe](https://github.com/RunnymedeRobotics1310/RavenEye/commit/bdcbefecc527428ca4f7b36146eda69456dd3234))
* Highlight owner team ([d8104e5](https://github.com/RunnymedeRobotics1310/RavenEye/commit/d8104e53d94328e391b04e3ffc993200074adf22))
* M1-M4 line fix ([16cc955](https://github.com/RunnymedeRobotics1310/RavenEye/commit/16cc955f30575659cf19918bb614ba4cbe0a7b2c))
* M11-M13 line fix ([25d392e](https://github.com/RunnymedeRobotics1310/RavenEye/commit/25d392e993efdafc9f2a820e747eae0db16c5223))
* M16 shown as not needed when finals is decided in 2 matches ([c870049](https://github.com/RunnymedeRobotics1310/RavenEye/commit/c8700497023563b7247bea49f89b8ee8a6878e6e))
* Move M13 up ([dbbac55](https://github.com/RunnymedeRobotics1310/RavenEye/commit/dbbac5556575eb302e9b59515813eb2e02907e72))
* Realign finals block ([7f0b489](https://github.com/RunnymedeRobotics1310/RavenEye/commit/7f0b489a3d826486aa97c24eeea695c106911a73))
* Separate overlapping lines ([f5138ee](https://github.com/RunnymedeRobotics1310/RavenEye/commit/f5138ee7ef14e9cbe73f652077da7bedb3f3fa35))

## [3.38.1](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.38.0...v3.38.1) (2026-03-30)


### Bug Fixes

* Fix security issue with url form field ([6fe991f](https://github.com/RunnymedeRobotics1310/RavenEye/commit/6fe991f74e9196bd3cfc4145dff24b2f26bf2b58))

# [3.38.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.37.1...v3.38.0) (2026-03-30)


### Bug Fixes

* schedule showing elimination bracket ([ead00b3](https://github.com/RunnymedeRobotics1310/RavenEye/commit/ead00b372eaa3b8cced602f2ae270e256b6bdb20))


### Features

* pmva with video review ([b0ee2be](https://github.com/RunnymedeRobotics1310/RavenEye/commit/b0ee2be054df060a6acf1b102cee9eae7ec91d73))

## [3.37.1](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.37.0...v3.37.1) (2026-03-29)


### Bug Fixes

* kiosk ([7be3dc6](https://github.com/RunnymedeRobotics1310/RavenEye/commit/7be3dc606cd8ccd2a9080b74d7ac7a7a6c2626dc))

# [3.37.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.36.5...v3.37.0) (2026-03-29)


### Features

* Elim bracket in kiosk ([ed2df5b](https://github.com/RunnymedeRobotics1310/RavenEye/commit/ed2df5b3be45294a1b83dbc086f854d7c98a15c2))

## [3.36.5](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.36.4...v3.36.5) (2026-03-29)


### Bug Fixes

* schedule colors ([4586a27](https://github.com/RunnymedeRobotics1310/RavenEye/commit/4586a27eb6aadfb04b31b8b19d4ac6bd0f581043))

## [3.36.4](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.36.3...v3.36.4) (2026-03-29)


### Bug Fixes

* Pit kiosk optimization 4 ([25a3a6c](https://github.com/RunnymedeRobotics1310/RavenEye/commit/25a3a6ca6038977f95f59102351fba988c780f7b))
* Pit kiosk optimization 5 - links ([7e03bd2](https://github.com/RunnymedeRobotics1310/RavenEye/commit/7e03bd274021544a16ad3da8779b71d3c426b040))
* Pit kiosk optimization 5 - results ([81d4eff](https://github.com/RunnymedeRobotics1310/RavenEye/commit/81d4effbea4815fbfce229f52ebeefdc76d2fdd1))

## [3.36.3](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.36.2...v3.36.3) (2026-03-29)


### Bug Fixes

* Pit kiosk optimization 3 ([fa4487b](https://github.com/RunnymedeRobotics1310/RavenEye/commit/fa4487b424298b2d630c4d7996b0c0e95bb9413d))

## [3.36.2](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.36.1...v3.36.2) (2026-03-29)


### Bug Fixes

* Pit kiosk optimization 2 ([cef03a4](https://github.com/RunnymedeRobotics1310/RavenEye/commit/cef03a487497f82348fe83a417ca69c06ca3e8ef))

## [3.36.1](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.36.0...v3.36.1) (2026-03-29)


### Bug Fixes

* Pit kiosk optimization ([09f47c4](https://github.com/RunnymedeRobotics1310/RavenEye/commit/09f47c4737c4a2721eb2cacba451177228354899))

# [3.36.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.35.14...v3.36.0) (2026-03-29)


### Features

* Pit kiosk ([9004283](https://github.com/RunnymedeRobotics1310/RavenEye/commit/9004283dc67fbc606cd121659814177b0c56eb23))

## [3.35.14](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.35.13...v3.35.14) (2026-03-28)


### Bug Fixes

* Better highlighting for next match ([59facf4](https://github.com/RunnymedeRobotics1310/RavenEye/commit/59facf4f3c4b5d8ba10662934c614779df80deda))
* Better queueing display ([ac749bd](https://github.com/RunnymedeRobotics1310/RavenEye/commit/ac749bd39c8246352b519067138b4ab794114104))

## [3.35.13](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.35.12...v3.35.13) (2026-03-28)


### Bug Fixes

* trigger build 4 ([436068e](https://github.com/RunnymedeRobotics1310/RavenEye/commit/436068ebd7b27fdecfbe2756fd9fe4bc81d7509e))

## [3.35.12](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.35.11...v3.35.12) (2026-03-28)


### Bug Fixes

* trigger build 3 ([86736c3](https://github.com/RunnymedeRobotics1310/RavenEye/commit/86736c31cd7bdcec62f0f7bf6386be5b66a50ad8))

## [3.35.11](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.35.10...v3.35.11) (2026-03-28)


### Bug Fixes

* trigger build 2 ([cccd3b7](https://github.com/RunnymedeRobotics1310/RavenEye/commit/cccd3b7a7500e48268d53bebf24381251e178941))

## [3.35.10](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.35.9...v3.35.10) (2026-03-28)


### Bug Fixes

* trigger build ([71dc43e](https://github.com/RunnymedeRobotics1310/RavenEye/commit/71dc43e6a41f53a3bb239f6634a6eb5d6da7909e))

## [3.35.9](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.35.8...v3.35.9) (2026-03-28)


### Bug Fixes

* nexus debug ([929a6dc](https://github.com/RunnymedeRobotics1310/RavenEye/commit/929a6dcfec339ab9b9c4d2a1dc4da99e5b4b0b09))

## [3.35.8](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.35.7...v3.35.8) (2026-03-28)


### Bug Fixes

* Better nexus debug info ([4f1a5dc](https://github.com/RunnymedeRobotics1310/RavenEye/commit/4f1a5dc6063d3bd5f763da835fef68b02771e9ad))
* Switch debug menu to type ahead ([0f70253](https://github.com/RunnymedeRobotics1310/RavenEye/commit/0f702534cbed048b26672fa6f9daec8f9a981eef))

## [3.35.7](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.35.6...v3.35.7) (2026-03-28)


### Bug Fixes

* Nexus api debug ([f3c6d17](https://github.com/RunnymedeRobotics1310/RavenEye/commit/f3c6d170bcc380f23968dbbcd73931e00bbfebcd))
* Typo fix ([4b88154](https://github.com/RunnymedeRobotics1310/RavenEye/commit/4b88154b53de9ba1d57872a3c12f6f9383b69056))

## [3.35.6](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.35.5...v3.35.6) (2026-03-28)


### Bug Fixes

* More CI refinements ([ae60993](https://github.com/RunnymedeRobotics1310/RavenEye/commit/ae609938a3f937df0d0e4525b4b5c9a253034a8e))

## [3.35.5](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.35.4...v3.35.5) (2026-03-28)


### Bug Fixes

* bump version to run new workflow ([827eb09](https://github.com/RunnymedeRobotics1310/RavenEye/commit/827eb0986e3f4b908547a7771546b4aee8238c13))

## [3.35.4](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.35.3...v3.35.4) (2026-03-28)


### Bug Fixes

* Don't cache tiny gha files ([dfb8d2e](https://github.com/RunnymedeRobotics1310/RavenEye/commit/dfb8d2e6b94652662c19af267186d09e59d6fa7b))

## [3.35.3](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.35.2...v3.35.3) (2026-03-28)


### Bug Fixes

* Faster raveneye builds ([bd48f06](https://github.com/RunnymedeRobotics1310/RavenEye/commit/bd48f0637c0280b699c43e889b1f520cce571b57))

## [3.35.2](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.35.1...v3.35.2) (2026-03-28)


### Bug Fixes

* Match schedule only background-syncs when logged in. ([c5d778e](https://github.com/RunnymedeRobotics1310/RavenEye/commit/c5d778ea43c1e250985b8ecbe213c3a37745d27c))

## [3.35.1](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.35.0...v3.35.1) (2026-03-28)


### Bug Fixes

* cors issue ([d29bc60](https://github.com/RunnymedeRobotics1310/RavenEye/commit/d29bc60b110d7d8c37880e8b0970b63670856bc5))

# [3.35.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.34.1...v3.35.0) (2026-03-28)


### Features

* Nexus queueing info no longer requires login ([c7930f5](https://github.com/RunnymedeRobotics1310/RavenEye/commit/c7930f56bf831ed6529be1fe95d0005cca77e756))

## [3.34.1](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.34.0...v3.34.1) (2026-03-28)


### Bug Fixes

* remove auto-selection of tournament to one that lets people choose the tournament they see the schedule for ([0d8241b](https://github.com/RunnymedeRobotics1310/RavenEye/commit/0d8241b4a6192899ec4ba078671c86d0b06904de))
* Rework order that shows the schedules ([c101869](https://github.com/RunnymedeRobotics1310/RavenEye/commit/c101869b6e582b332ac67f83327c6c7aff928d39))

# [3.34.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.33.1...v3.34.0) (2026-03-27)


### Bug Fixes

* PMVA legend update ([b574028](https://github.com/RunnymedeRobotics1310/RavenEye/commit/b57402899c5b4201d90e7ac23b313a270e9f0659))
* PMVA report refinement ([829e95f](https://github.com/RunnymedeRobotics1310/RavenEye/commit/829e95f3c917eab37307ea6213dd106442436ad6))


### Features

* PMVA report v2 mark 1 ([5b0c81a](https://github.com/RunnymedeRobotics1310/RavenEye/commit/5b0c81a9af22b792a560b7654c5f54d4569a57a6))

## [3.33.1](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.33.0...v3.33.1) (2026-03-27)


### Bug Fixes

* Capture PMVA data ([efb8b0d](https://github.com/RunnymedeRobotics1310/RavenEye/commit/efb8b0d0148d31fb1d5d9e5ea6fb5e159b5876b2))
* Config sync after server sync ([de9f069](https://github.com/RunnymedeRobotics1310/RavenEye/commit/de9f06991884027d3f31b1a6dec2e3d988cf944f))
* Stuck records on sync ([9332dc5](https://github.com/RunnymedeRobotics1310/RavenEye/commit/9332dc5d4f2b78203020ca51c5b4b85b42267257))

# [3.33.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.32.0...v3.33.0) (2026-03-27)


### Features

* Add ability to delete events when necessary ([a76a974](https://github.com/RunnymedeRobotics1310/RavenEye/commit/a76a9747818e18ab6f29296d3807af1f08ccb869))

# [3.32.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.31.0...v3.32.0) (2026-03-27)


### Bug Fixes

* Note fields on pmva sequence page as required ([1d8c455](https://github.com/RunnymedeRobotics1310/RavenEye/commit/1d8c4555d742b53d0651008edf5c0337b50705ac))


### Features

* Add delete support ([02b4a30](https://github.com/RunnymedeRobotics1310/RavenEye/commit/02b4a30152da6f706e16a32982d8228fe1e421b3))

# [3.31.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.30.0...v3.31.0) (2026-03-27)


### Bug Fixes

* Don't hide current tournament from schedule page ([be27f87](https://github.com/RunnymedeRobotics1310/RavenEye/commit/be27f8743e43e1e8199812ed04789eb198f4bd4e))
* Filter tournaments ([668ac42](https://github.com/RunnymedeRobotics1310/RavenEye/commit/668ac42fc26dc0a2a8b7e004546519c8f46a27d2))
* Fix schedule back links ([974ee98](https://github.com/RunnymedeRobotics1310/RavenEye/commit/974ee9809a0257b0ea84b73be281f073c73256f7))
* Formatting cleanup for auto-complete ([6e0217d](https://github.com/RunnymedeRobotics1310/RavenEye/commit/6e0217df9ba4a733d5fa9879af089d40b810cb93))
* Hide report page sketches ([174a4e9](https://github.com/RunnymedeRobotics1310/RavenEye/commit/174a4e95058c7bb3c2ec19bbf3995c84ae4a1bf2))
* select team row format ([b7c8454](https://github.com/RunnymedeRobotics1310/RavenEye/commit/b7c84548e59135282bc5259e3cd808269d4382f8))
* Show current event type first on schedule page, until tournament is over ([203ee6d](https://github.com/RunnymedeRobotics1310/RavenEye/commit/203ee6dedeecb4ba1c0b5fae1bc35457d400133f))


### Features

* Add fuel pickup scores to team report ([fd04481](https://github.com/RunnymedeRobotics1310/RavenEye/commit/fd04481d2cc7f45f03af138bb22ed51de41422eb))
* Show team names on schedule page ([f73cb9e](https://github.com/RunnymedeRobotics1310/RavenEye/commit/f73cb9e154864b59509568275ead9080e541f84c))
* Type-ahead for track robot at comp page - tournament selection ([bc4b62f](https://github.com/RunnymedeRobotics1310/RavenEye/commit/bc4b62f579ede630bc1ae16bc5258156ed6012b5))

# [3.30.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.29.2...v3.30.0) (2026-03-27)


### Bug Fixes

* Handle bad stat data in team report ([ed5d117](https://github.com/RunnymedeRobotics1310/RavenEye/commit/ed5d117641a0637eaf4c2b6071d6e4d69f955083))
* Larger spinner ([7a137e7](https://github.com/RunnymedeRobotics1310/RavenEye/commit/7a137e7b7d280d1a57c61f7f78abea59fbc9d628))
* Switch team report to use type-ahead ([947aab9](https://github.com/RunnymedeRobotics1310/RavenEye/commit/947aab9810d3ab242b8de807a4f176de85f9f1bf))


### Features

* Shoot to Home reports ([1532e24](https://github.com/RunnymedeRobotics1310/RavenEye/commit/1532e24174195cee1a000c8d9016abfb8733f576))

## [3.29.2](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.29.1...v3.29.2) (2026-03-27)


### Bug Fixes

* Default note field is now a 2-lien text area ([4015ad3](https://github.com/RunnymedeRobotics1310/RavenEye/commit/4015ad357d5df4fa080ea5e4d58a8a907cfc85df))
* Default note field is now full-width ([b4cafce](https://github.com/RunnymedeRobotics1310/RavenEye/commit/b4cafcea957056b337c978b535e2a4dc80fb85ac))

## [3.29.1](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.29.0...v3.29.1) (2026-03-27)


### Bug Fixes

* look up team for reports ([4d451d2](https://github.com/RunnymedeRobotics1310/RavenEye/commit/4d451d234fea0a3640b7ee9d9621601bd0c547f5))

# [3.29.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.28.0...v3.29.0) (2026-03-26)


### Features

* Defence strat notes now added to team report ([71b2c17](https://github.com/RunnymedeRobotics1310/RavenEye/commit/71b2c17aed3c0ca5c1071f35798826df153e1b7b))

# [3.28.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.27.1...v3.28.0) (2026-03-26)


### Bug Fixes

* npe on sequence event page ([2b72fdc](https://github.com/RunnymedeRobotics1310/RavenEye/commit/2b72fdcb8ead1c580651397d688264b558311ed5))
* Re-order report pages ([028834d](https://github.com/RunnymedeRobotics1310/RavenEye/commit/028834daaf3254b98f07981afa0876e91da14e8b))


### Features

* Custom page for PMVALoadShootSequence ([fe954ac](https://github.com/RunnymedeRobotics1310/RavenEye/commit/fe954acde229ac7d4f3130ad32668eff458d4da0))

## [3.27.1](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.27.0...v3.27.1) (2026-03-24)


### Bug Fixes

* admin menu reacts to login/logout without requiring page refresh ([b745f33](https://github.com/RunnymedeRobotics1310/RavenEye/commit/b745f339ea47bcf035c3fecf95f13b023dee5d49))

# [3.27.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.26.0...v3.27.0) (2026-03-24)


### Features

* add concave notch styling on sequence-end buttons ([9f22dda](https://github.com/RunnymedeRobotics1310/RavenEye/commit/9f22dda21e54b4def19a218536fecf8706b4e252))

# [3.26.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.25.2...v3.26.0) (2026-03-24)


### Features

* replace loading spinner with animated raven wings SVG ([205c71a](https://github.com/RunnymedeRobotics1310/RavenEye/commit/205c71a750ca776a2fef2aa9ff26c368090f2e39))

## [3.25.2](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.25.1...v3.25.2) (2026-03-22)


### Bug Fixes

* skip queue status fetch when owner team is not in tournament ([75ef133](https://github.com/RunnymedeRobotics1310/RavenEye/commit/75ef1333779259be63dccb801a041fae7a53ad7f))

## [3.25.1](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.25.0...v3.25.1) (2026-03-22)


### Bug Fixes

* reduce FRC API load with smart sync completion detection and schedule page stability ([9d9fd70](https://github.com/RunnymedeRobotics1310/RavenEye/commit/9d9fd70918994e427598ba86ba71deac79faa277))

# [3.25.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.24.2...v3.25.0) (2026-03-22)


### Features

* rename Team Schedule to Tournament Report ([2310cd8](https://github.com/RunnymedeRobotics1310/RavenEye/commit/2310cd8400165c3f34e78bb81fc44282966b89a7))

## [3.24.2](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.24.1...v3.24.2) (2026-03-22)


### Bug Fixes

* guard against empty/malformed schedule API responses ([5e09c74](https://github.com/RunnymedeRobotics1310/RavenEye/commit/5e09c74667fcf01c5f557ba607047eea39f77f49))

## [3.24.1](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.24.0...v3.24.1) (2026-03-22)


### Bug Fixes

* guard against undefined matches in schedule response ([c77122c](https://github.com/RunnymedeRobotics1310/RavenEye/commit/c77122ca65fe02f6505a656d7d6c945e4fac11a3))

# [3.24.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.23.6...v3.24.0) (2026-03-22)


### Features

* add watched tournaments and improve schedule report ([74d93fe](https://github.com/RunnymedeRobotics1310/RavenEye/commit/74d93fe19c40e35f6d1e9645200c47611a2184ae))

## [3.23.6](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.23.5...v3.23.6) (2026-03-19)


### Bug Fixes

* schedule tournament picker fallback and left-justify report comments ([c0ca37c](https://github.com/RunnymedeRobotics1310/RavenEye/commit/c0ca37c35760784d244faf61a6c948de6f000616))

## [3.23.5](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.23.4...v3.23.5) (2026-03-19)


### Bug Fixes

* move clear cache button to sync and reports pages ([d439548](https://github.com/RunnymedeRobotics1310/RavenEye/commit/d4395480143c5c8a653f3f395fde509c2c747cb6))

## [3.23.4](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.23.3...v3.23.4) (2026-03-19)


### Bug Fixes

* improve report match labels, chrono filter, and star rating SVG ([bc447fa](https://github.com/RunnymedeRobotics1310/RavenEye/commit/bc447faa5620835d4490fe61704a3b05e66442ec))

## [3.23.3](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.23.2...v3.23.3) (2026-03-19)


### Bug Fixes

* normalize PMVA percentages and add match context to comments ([a153ebd](https://github.com/RunnymedeRobotics1310/RavenEye/commit/a153ebde42b6b93762f64ad083dc6881af681b6f))

## [3.23.2](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.23.1...v3.23.2) (2026-03-19)


### Bug Fixes

* Event totals ([abf6a13](https://github.com/RunnymedeRobotics1310/RavenEye/commit/abf6a1323d42deee807c1e0491b31b55111bac0c))
* Further report cleanup ([42ad5f0](https://github.com/RunnymedeRobotics1310/RavenEye/commit/42ad5f0c381492564dd2876056bef9fe8e77ab28))

## [3.23.1](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.23.0...v3.23.1) (2026-03-19)


### Bug Fixes

* PMVA report fixes ([e12c733](https://github.com/RunnymedeRobotics1310/RavenEye/commit/e12c733141667b52ba5767c9cd40d4cd971f3085))
* PMVA report title ([f87832f](https://github.com/RunnymedeRobotics1310/RavenEye/commit/f87832f30e1ba7ed4828f33e9c63c7933ba204ec))
* Rework related report titles ([77e02ab](https://github.com/RunnymedeRobotics1310/RavenEye/commit/77e02ab2af7821c3be1717490ea2f9e927e1e283))

# [3.23.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.22.0...v3.23.0) (2026-03-19)


### Features

* Sync scouting data from source ([0a86a79](https://github.com/RunnymedeRobotics1310/RavenEye/commit/0a86a79dc3bd5498b099c5a0f0fa4ab58d695ad5))

# [3.22.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.21.2...v3.22.0) (2026-03-17)


### Features

* Post-Match Video Analysis Report ([993e599](https://github.com/RunnymedeRobotics1310/RavenEye/commit/993e599cf2a0a621d7181d06f3f35d2597a14175))

## [3.21.2](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.21.1...v3.21.2) (2026-03-16)


### Bug Fixes

* increase login JWT NBF grace period from 2ms to 250ms ([0ce076b](https://github.com/RunnymedeRobotics1310/RavenEye/commit/0ce076bf1b18916eb29ad9c53f0bc720ee604022))

## [3.21.1](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.21.0...v3.21.1) (2026-03-14)


### Bug Fixes

* add nexus ket to docker compose environment variables ([#216](https://github.com/RunnymedeRobotics1310/RavenEye/issues/216)) ([7ae2f00](https://github.com/RunnymedeRobotics1310/RavenEye/commit/7ae2f00be4738d5f71cdb7cf7624db5218510d93))

# [3.21.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.20.0...v3.21.0) (2026-03-14)


### Features

* add custom tournament sequence stats to team summary report ([3be1ace](https://github.com/RunnymedeRobotics1310/RavenEye/commit/3be1acea2b7eeb9c887247ce7cf6c647cb203d25))

# [3.20.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.19.0...v3.20.0) (2026-03-13)


### Features

* add Nexus API integration for match queueing notifications ([b8e1d81](https://github.com/RunnymedeRobotics1310/RavenEye/commit/b8e1d81e44e50e8f0a62fb87f3906e57baa00da9))

# [3.19.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.18.0...v3.19.0) (2026-03-13)


### Features

* responsive team schedule for portrait phones ([55ed964](https://github.com/RunnymedeRobotics1310/RavenEye/commit/55ed964d527891a38cd6a4b6e1806de10635c7a4))

# [3.18.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.17.0...v3.18.0) (2026-03-13)


### Features

* make team schedule page public and add ranking strength display ([ea06b6a](https://github.com/RunnymedeRobotics1310/RavenEye/commit/ea06b6a139a40a472f5d74e5bed8a3d408fe5e2f))

# [3.17.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.16.0...v3.17.0) (2026-03-13)


### Features

* highlight own team row in rankings table ([002e1d4](https://github.com/RunnymedeRobotics1310/RavenEye/commit/002e1d429709af5309c065085c8587ae724820c6))

# [3.16.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.15.1...v3.16.0) (2026-03-13)


### Features

* display rankings table and rank info on schedule page ([b75c9dd](https://github.com/RunnymedeRobotics1310/RavenEye/commit/b75c9dd8acd5d9c81b6c0d9a0c35a24fa61a830e))

## [3.15.1](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.15.0...v3.15.1) (2026-03-13)


### Bug Fixes

* fix null errors on sequence report ([ed3e3d2](https://github.com/RunnymedeRobotics1310/RavenEye/commit/ed3e3d20edc5b2646b84e674452fa4601597ac67))

# [3.15.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.14.0...v3.15.0) (2026-03-13)


### Features

* Add support for disabling items. ([863ffeb](https://github.com/RunnymedeRobotics1310/RavenEye/commit/863ffeb9377fea875cb632f5d95f3630cb9f8e01))
* Schedule display ([82e820f](https://github.com/RunnymedeRobotics1310/RavenEye/commit/82e820ffafc0c5a463505ab26386dd266494691b))

# [3.14.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.13.10...v3.14.0) (2026-03-13)


### Features

* Add support for disabling items. ([#207](https://github.com/RunnymedeRobotics1310/RavenEye/issues/207)) ([a8f7244](https://github.com/RunnymedeRobotics1310/RavenEye/commit/a8f724487ab6e27e689f33474284f9365d1fdb38))

## [3.13.10](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.13.9...v3.13.10) (2026-03-12)


### Bug Fixes

* Add area selection in sequence report selection, and show note in reports ([45b3d64](https://github.com/RunnymedeRobotics1310/RavenEye/commit/45b3d64d043f3d0f0f164870f0d78d891e983050))
* Add comments and alerts to summary report ([433a347](https://github.com/RunnymedeRobotics1310/RavenEye/commit/433a3478c87657a7cbdec78eca3ff5e95d8223d2))
* Don't show sequences if no data is present ([3d4e978](https://github.com/RunnymedeRobotics1310/RavenEye/commit/3d4e9785a3abe0fd1090632ceede02815b3d0266))
* Render graphic for sequence buttons ([14aa427](https://github.com/RunnymedeRobotics1310/RavenEye/commit/14aa427b7b11f09c68e8304c1910b263dd00aada))

## [3.13.9](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.13.8...v3.13.9) (2026-03-12)


### Bug Fixes

* Add chronological event report ([810a12a](https://github.com/RunnymedeRobotics1310/RavenEye/commit/810a12a384302ce949fa96401fe94444dea910b0))

## [3.13.8](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.13.7...v3.13.8) (2026-03-12)


### Bug Fixes

* No new window for megareport. ([6169434](https://github.com/RunnymedeRobotics1310/RavenEye/commit/6169434f9b56826ef507f2e481f7cd6547f4cd5d))

## [3.13.7](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.13.6...v3.13.7) (2026-03-12)


### Bug Fixes

* Deploy megareport ([e9d335f](https://github.com/RunnymedeRobotics1310/RavenEye/commit/e9d335f48dabd2df0408af329291b90b17778c23))

## [3.13.6](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.13.5...v3.13.6) (2026-03-12)


### Bug Fixes

* Trigger release ([e3ba49e](https://github.com/RunnymedeRobotics1310/RavenEye/commit/e3ba49e2dac27e0178b2b18e38f1541acc240286))

## [3.13.5](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.13.4...v3.13.5) (2026-03-12)


### Bug Fixes

* Generic sequence report ([#201](https://github.com/RunnymedeRobotics1310/RavenEye/issues/201)) ([ddb88c8](https://github.com/RunnymedeRobotics1310/RavenEye/commit/ddb88c89361865a3a7d77953e5b04201fbe3e1e7))

## [3.13.4](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.13.3...v3.13.4) (2026-03-12)


### Bug Fixes

* Rework sync to only sync necessary data, use bulk operations, and handle errors more cleanly. ([#200](https://github.com/RunnymedeRobotics1310/RavenEye/issues/200)) ([101e90e](https://github.com/RunnymedeRobotics1310/RavenEye/commit/101e90e0227e36b5166a9d1b5fb4c68ee895a6dd))

## [3.13.3](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.13.2...v3.13.3) (2026-03-11)


### Bug Fixes

* Clean up tournament list rendering for mobile and update sync process to split manual and bulk due to very slow tournament sync ([#199](https://github.com/RunnymedeRobotics1310/RavenEye/issues/199)) ([f163dd9](https://github.com/RunnymedeRobotics1310/RavenEye/commit/f163dd917ac3c3b4a0ac074caffa0c015c9459ee))

## [3.13.2](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.13.1...v3.13.2) (2026-03-11)


### Bug Fixes

* Fetch schedules on-demand without requiring a force-sync ([168466d](https://github.com/RunnymedeRobotics1310/RavenEye/commit/168466d7a1d2a53672e7df7be80af49968c1b793))
* Merge main into home-links ([6daf9b8](https://github.com/RunnymedeRobotics1310/RavenEye/commit/6daf9b895e7cbac8caad16d9c976b78523e4f91b))
* Merge main into report-outline ([e61af42](https://github.com/RunnymedeRobotics1310/RavenEye/commit/e61af4230e6c79bc45a443ba8f05443d4ba3fea7))
* Refresh look and feel ([3bed957](https://github.com/RunnymedeRobotics1310/RavenEye/commit/3bed957c1717eff02dc7409a7ad9f02ebd77b493))
* Show all tournaments in comp scouting list to facilitate video-based tracking ([bb066e8](https://github.com/RunnymedeRobotics1310/RavenEye/commit/bb066e8998b98f81cf27b07e65f606978a5be58a))
* Switch to release bot for better branch protection controls. ([1863df7](https://github.com/RunnymedeRobotics1310/RavenEye/commit/1863df7cc5b21a1bea379cda6df1140f168a73c9))
* Tidy up home page ([aa3e7ac](https://github.com/RunnymedeRobotics1310/RavenEye/commit/aa3e7ac174a1244e22acf5d9b73a238b574fd39b))

## [3.13.1](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.13.0...v3.13.1) (2026-03-10)


### Bug Fixes

* Proper drill sequence end event type ([1ee9dfe](https://github.com/RunnymedeRobotics1310/RavenEye/commit/1ee9dfe4ebc5bdb609de8653779e64ef750ff379))

# [3.13.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.12.0...v3.13.0) (2026-03-09)


### Features

* Drill sequence report ([#193](https://github.com/RunnymedeRobotics1310/RavenEye/issues/193)) ([30fc09f](https://github.com/RunnymedeRobotics1310/RavenEye/commit/30fc09fb44cda48389f702706d56d8b5dad7ca2a))

# [3.12.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.11.0...v3.12.0) (2026-03-06)


### Bug Fixes

* Switch to PAT for releases ([60f28ab](https://github.com/RunnymedeRobotics1310/RavenEye/commit/60f28abf68337dc115fe748688bb0e384a648464))
* Switch to PAT for releases ([#189](https://github.com/RunnymedeRobotics1310/RavenEye/issues/189)) ([0529103](https://github.com/RunnymedeRobotics1310/RavenEye/commit/0529103c35b3f9186ff2cf6a04cacb280659b999))
* Sync status screen updates ([31c7597](https://github.com/RunnymedeRobotics1310/RavenEye/commit/31c75973620d54e40ef3a24e712888ee405e3cc4))
* Trigger build ([c8495ac](https://github.com/RunnymedeRobotics1310/RavenEye/commit/c8495acfdae6a75a080b746800990b143b465de0))


### Features

* Implement robot alerts ([9b4f567](https://github.com/RunnymedeRobotics1310/RavenEye/commit/9b4f567dd0b41278570ced420328177c1dc8afc7))

# [3.11.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.10.5...v3.11.0) (2026-03-01)


### Features

* Add CI workflow for pull request checks ([35fbd06](https://github.com/RunnymedeRobotics1310/RavenEye/commit/35fbd060c61894f3bcedcde02a080b619bf755cc))

## [3.10.5](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.10.4...v3.10.5) (2026-03-01)


### Bug Fixes

* Bump Docker Node image from 22 to 24 ([cfee462](https://github.com/RunnymedeRobotics1310/RavenEye/commit/cfee4628fbcb750d4c90c092fbe4abd47a7d0f85))

## [3.10.4](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.10.3...v3.10.4) (2026-03-01)


### Bug Fixes

* Update Dependencies ([f86f77a](https://github.com/RunnymedeRobotics1310/RavenEye/commit/f86f77a555e4a1b378dde187d3a364edc80b6328))

## [3.10.3](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.10.2...v3.10.3) (2026-03-01)


### Bug Fixes

* invoke goBack() function instead of returning it. Add debug statements ([09434e9](https://github.com/RunnymedeRobotics1310/RavenEye/commit/09434e90e004d52aa3fb81dd9dea69fabd397f97))
* Proper enablement of sequence buttons ([18474b8](https://github.com/RunnymedeRobotics1310/RavenEye/commit/18474b8f976ea86864f206eb81a427ef3e88e5a1))
* Typecheck fixes ([5fe4805](https://github.com/RunnymedeRobotics1310/RavenEye/commit/5fe4805a30d93678e4618242e7e6251087928190))
* Typecheck fixes ([dd3ed0d](https://github.com/RunnymedeRobotics1310/RavenEye/commit/dd3ed0dc1a71df9865672005c8504db0e39f5b46))

## [3.10.2](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.10.1...v3.10.2) (2026-02-22)


### Bug Fixes

* iOS bug re title graphic ([#180](https://github.com/RunnymedeRobotics1310/RavenEye/issues/180)) ([1f8607b](https://github.com/RunnymedeRobotics1310/RavenEye/commit/1f8607b5225e2476e46a84ce6c6aca9dd6538aa1))

## [3.10.1](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.10.0...v3.10.1) (2026-02-22)


### Bug Fixes

* Score fuel formatting cleanup ([#179](https://github.com/RunnymedeRobotics1310/RavenEye/issues/179)) ([e534ed4](https://github.com/RunnymedeRobotics1310/RavenEye/commit/e534ed4869f555de9db1c8df81dff982fc1b13a0))

# [3.10.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.9.0...v3.10.0) (2026-02-21)


### Features

* configurable buttons by eventtype. ([#178](https://github.com/RunnymedeRobotics1310/RavenEye/issues/178)) ([f1747ec](https://github.com/RunnymedeRobotics1310/RavenEye/commit/f1747ec7763f12df2587ab67564b2f946b453b9e))

# [3.9.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.8.0...v3.9.0) (2026-02-21)


### Features

* Refresh token support ([#177](https://github.com/RunnymedeRobotics1310/RavenEye/issues/177)) ([1d47c09](https://github.com/RunnymedeRobotics1310/RavenEye/commit/1d47c09902e4a421d18da9d960a2dcbaef32dcf1))

# [3.8.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.7.2...v3.8.0) (2026-02-21)


### Bug Fixes

* Don't require login for design system page ([f9fd86b](https://github.com/RunnymedeRobotics1310/RavenEye/commit/f9fd86bf6e85b2d203c719f1455a240034afd020))
* icon alignment ([0054f43](https://github.com/RunnymedeRobotics1310/RavenEye/commit/0054f43ea6d7159a7c7e8b7d75b861e8bec66134))
* Look and feel updates for light mode and mobile view ([c70c0ef](https://github.com/RunnymedeRobotics1310/RavenEye/commit/c70c0ef1d43e2fcecf130a16ccd79ec4ad87d9b4))
* merge conflict resolution ([df87106](https://github.com/RunnymedeRobotics1310/RavenEye/commit/df8710637608f33c723d91f600b66303e6deca4f))
* Minor look and feel refinements for top nav ([606e6a3](https://github.com/RunnymedeRobotics1310/RavenEye/commit/606e6a353a02b4208d20500f4b8a5cd96e390d50))


### Features

* admin menu ([dbada62](https://github.com/RunnymedeRobotics1310/RavenEye/commit/dbada62d920234b48639030e7e5882dc861573bf))
* admin menu ([9355ecb](https://github.com/RunnymedeRobotics1310/RavenEye/commit/9355ecb7268faf322305d65fd1798b308aef5989))

## [3.7.2](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.7.1...v3.7.2) (2026-02-21)


### Bug Fixes

* Better formatting for sequencew type checkboxes ([1bda0ad](https://github.com/RunnymedeRobotics1310/RavenEye/commit/1bda0ad9f5a58e5bf5412efe26d557fa597974c3))
* don't allow _ in codes. ([172df1a](https://github.com/RunnymedeRobotics1310/RavenEye/commit/172df1a8d4c2acd895b1a1d125741f89547bec6a))
* Safe delete support ([71a6ba2](https://github.com/RunnymedeRobotics1310/RavenEye/commit/71a6ba2ec38f59e20f385f11f8783a2fda0b4541))

## [3.7.1](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.7.0...v3.7.1) (2026-02-20)


### Bug Fixes

* Remove unused styles ([6abaf39](https://github.com/RunnymedeRobotics1310/RavenEye/commit/6abaf397b4d2016374137109e6e256f021fcf704))

# [3.7.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.6.1...v3.7.0) (2026-02-20)


### Features

* Sync from server ([#169](https://github.com/RunnymedeRobotics1310/RavenEye/issues/169)) ([d5b488b](https://github.com/RunnymedeRobotics1310/RavenEye/commit/d5b488bfabf33aed4494da8e346cac0b4583645c))

## [3.6.1](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.6.0...v3.6.1) (2026-02-19)


### Bug Fixes

* Design system renders sync colors ([f408f00](https://github.com/RunnymedeRobotics1310/RavenEye/commit/f408f001c06a7ee95eba6c2df819ed58457697c3))
* Look and feel fixes: ([bfae715](https://github.com/RunnymedeRobotics1310/RavenEye/commit/bfae715b9c0515fc59fd2b5587db62eba36e0f7b))
* Standardize form field usage ([be74067](https://github.com/RunnymedeRobotics1310/RavenEye/commit/be740677ff538a0a7e3d34c5042ec2830d2a79b6))

# [3.6.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.5.0...v3.6.0) (2026-02-18)


### Features

* red ui ([81572fd](https://github.com/RunnymedeRobotics1310/RavenEye/commit/81572fd19aa8b94a772af2f00a9971ab07b585b9))

# [3.5.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.4.3...v3.5.0) (2026-02-17)


### Bug Fixes

* Remove debug component ([19c9a83](https://github.com/RunnymedeRobotics1310/RavenEye/commit/19c9a8396220e25c68954e94a111d893727faa57))
* Restore reference data ([ae6c34a](https://github.com/RunnymedeRobotics1310/RavenEye/commit/ae6c34a3ac0a135591acd0b5c6d786bf069368a1))
* Restore reference data ([fa5bcab](https://github.com/RunnymedeRobotics1310/RavenEye/commit/fa5bcab89519b87f04a049ce0827110c34dc417c))


### Features

* Better formatting of eventtype page ([bebebc0](https://github.com/RunnymedeRobotics1310/RavenEye/commit/bebebc04a5594a73e0ab90b7fa11088d9e76865d))
* Dynamic wiring for event recording ([cbefb13](https://github.com/RunnymedeRobotics1310/RavenEye/commit/cbefb13bcde08629e3aad4a6cbb75e1c2746324a))
* Force-sync data with FRC ([c292d8e](https://github.com/RunnymedeRobotics1310/RavenEye/commit/c292d8e91374d0fbd2e785a42e90335645670ba2))
* Show note and quantity on event type if necessary ([128f0a2](https://github.com/RunnymedeRobotics1310/RavenEye/commit/128f0a25b8c9ea14248f20534cd688a119c9ea02))
* Wire track UI's session selection to back-end functions. Track UI framework. ([a31e614](https://github.com/RunnymedeRobotics1310/RavenEye/commit/a31e614d72a2cc70ad43400415cb04f00be3ab13))

## [3.4.3](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.4.2...v3.4.3) (2026-02-14)


### Bug Fixes

* Allow 2ms grace time on JWT ([4df6b2d](https://github.com/RunnymedeRobotics1310/RavenEye/commit/4df6b2d662625bf118ae5cdc94382885e4f89c33))

## [3.4.2](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.4.1...v3.4.2) (2026-02-14)


### Bug Fixes

* Update build system ([d4bbdaf](https://github.com/RunnymedeRobotics1310/RavenEye/commit/d4bbdaf843369e615076d5ed967dec143e60bd29))

## [3.4.1](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.4.0...v3.4.1) (2026-02-14)


### Bug Fixes

* Temporarily disable arm builds ([48f51ec](https://github.com/RunnymedeRobotics1310/RavenEye/commit/48f51ec82bdb5b0a6273468a327f855abe670959))

# [3.4.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.3.8...v3.4.0) (2026-02-14)


### Bug Fixes

* Disabled users look a little more disabled ([b623aa9](https://github.com/RunnymedeRobotics1310/RavenEye/commit/b623aa9ff2d1f42871269bc114c83c8443eca20d))
* Hide admin menu from non-admins ([ed7dcfa](https://github.com/RunnymedeRobotics1310/RavenEye/commit/ed7dcfa320d6ed2b847321e968dd60a4ce02959e))
* Send password up to server as passwordHash field ([e596fdd](https://github.com/RunnymedeRobotics1310/RavenEye/commit/e596fdd042ca38625b1286c817a39399e466cc30))
* Sort users disabled first ([d07d886](https://github.com/RunnymedeRobotics1310/RavenEye/commit/d07d886ed175b3b492281f4fad75f43a55d5a638))
* Switch to test containers ([b829f8b](https://github.com/RunnymedeRobotics1310/RavenEye/commit/b829f8b5907350698b9f1d4e8d383159972cfcbb))


### Features

* Admin users shown forgot password banner ([2c254bb](https://github.com/RunnymedeRobotics1310/RavenEye/commit/2c254bb43a709781d8e1e53c3ad05da331ed70f8))
* Event type UI ([dd5dc1c](https://github.com/RunnymedeRobotics1310/RavenEye/commit/dd5dc1ca3c52f12125464a11d70304fac0423aa9))
* Forgot password and edit my profile and change my password ([9bf968d](https://github.com/RunnymedeRobotics1310/RavenEye/commit/9bf968d8768db56e9cba8437c7c9f28c7c65048b))

## [3.3.8](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.3.7...v3.3.8) (2026-02-02)


### Bug Fixes

* RB version as header not body value ([#158](https://github.com/RunnymedeRobotics1310/RavenEye/issues/158)) ([9e43c90](https://github.com/RunnymedeRobotics1310/RavenEye/commit/9e43c905cb4afd1988348f237d7c8bc63e9c5cdb))

## [3.3.7](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.3.6...v3.3.7) (2026-02-02)


### Bug Fixes

* Switch action to use runner tokens ([e9c5830](https://github.com/RunnymedeRobotics1310/RavenEye/commit/e9c5830db3c0fcd8cc0f8ddbc093b31a92fcab72))

## [3.3.6](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.3.5...v3.3.6) (2026-02-01)


### Bug Fixes

* Display version number for RavenEye AND RavenBrain in footer ([#152](https://github.com/RunnymedeRobotics1310/RavenEye/issues/152)) ([f804dda](https://github.com/RunnymedeRobotics1310/RavenEye/commit/f804dda4643050e987b3693e57a25cbd4b843020))

## [3.3.6](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.3.5...v3.3.6) (2026-02-01)


### Bug Fixes

* Display version number for RavenEye AND RavenBrain in footer ([#152](https://github.com/RunnymedeRobotics1310/RavenEye/issues/152)) ([f804dda](https://github.com/RunnymedeRobotics1310/RavenEye/commit/f804dda4643050e987b3693e57a25cbd4b843020))

## [3.3.5](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.3.4...v3.3.5) (2026-02-01)


### Bug Fixes

* Fix gitignore comment ([649e9df](https://github.com/RunnymedeRobotics1310/RavenEye/commit/649e9df290798597ce32c996ea71d798d228a396))
* Remove .env which was confusing people ([32b062c](https://github.com/RunnymedeRobotics1310/RavenEye/commit/32b062cd86ead979ba0211710624e87ebf0b7aff))

## [3.3.4](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.3.3...v3.3.4) (2026-02-01)


### Bug Fixes

* Link publish and build ([f306c95](https://github.com/RunnymedeRobotics1310/RavenEye/commit/f306c95d3d9c2b234912353b2e400590cb28d926))
* Semver script fix ([7f50477](https://github.com/RunnymedeRobotics1310/RavenEye/commit/7f50477206679b1b816ffefa5b73e2ebed1abb98))

## [3.3.3](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.3.2...v3.3.3) (2026-02-01)


### Bug Fixes

* Build multiple platforms ([5df82a2](https://github.com/RunnymedeRobotics1310/RavenEye/commit/5df82a20a69cb6c351708d132896e27a5d9eff1e))

## [3.3.2](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.3.1...v3.3.2) (2026-02-01)


### Bug Fixes

* Debug statements ([54877cb](https://github.com/RunnymedeRobotics1310/RavenEye/commit/54877cbb4dda34c908f6084af6a41aefef420890))
* Fix version number reporting. ([#140](https://github.com/RunnymedeRobotics1310/RavenEye/issues/140)) ([e403623](https://github.com/RunnymedeRobotics1310/RavenEye/commit/e403623bfc8df90f9a76c7e27b7e8b92595dca54))
* Move all docker config to RavenEye. ([449a21c](https://github.com/RunnymedeRobotics1310/RavenEye/commit/449a21cab7864c0f340fb0c3ba5f9dc0f6cb979e))
* Move raveneye from dev to prod docker-compose file ([7fabfd2](https://github.com/RunnymedeRobotics1310/RavenEye/commit/7fabfd282839f16772bfecdc3d13c814b5b03db9))
* nginx config. ([badac1d](https://github.com/RunnymedeRobotics1310/RavenEye/commit/badac1d4f1e80e8eaceb8de13cf3f656c13c778d))
* Release build to GHCR and do deployment on local runner ([44c6adf](https://github.com/RunnymedeRobotics1310/RavenEye/commit/44c6adf477d204dc59989126479dfda041e7fdd8))
* Track ui framework ([16350e1](https://github.com/RunnymedeRobotics1310/RavenEye/commit/16350e1ac80d283b6a375f171cdadeed912d74e4))
* Typescript config updates to correct build issue ([da85e1e](https://github.com/RunnymedeRobotics1310/RavenEye/commit/da85e1e1e1b08fcddeee6d8a57aafc44ddac958c))

## [3.3.1](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.3.0...v3.3.1) (2026-01-15)


### Bug Fixes

* Add ci/cd support and automatic production deployment. Includes a detailed deployment README.md. ([#139](https://github.com/RunnymedeRobotics1310/RavenEye/issues/139)) ([0258930](https://github.com/RunnymedeRobotics1310/RavenEye/commit/02589304670750e61f91499883add364df720c4c))

# [3.3.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.2.2...v3.3.0) (2026-01-09)


### Bug Fixes

* clean up error handling in rbauth.ts ([481e959](https://github.com/RunnymedeRobotics1310/RavenEye/commit/481e959d5e9158126a63696ef1051001549feb74))
* Comment storage ([32dd5b8](https://github.com/RunnymedeRobotics1310/RavenEye/commit/32dd5b87f0dddd3b75122f0013c9ae968f40ea5a))
* rename method ([2d13de9](https://github.com/RunnymedeRobotics1310/RavenEye/commit/2d13de9691a378fd9b4df5c1e7d24f0cfcaa7cee))
* Update db version number ([b620458](https://github.com/RunnymedeRobotics1310/RavenEye/commit/b6204584c6def3fbb3bfc90bccf5d5d6c988c8ea))


### Features

* Quick Comment sync ([798f636](https://github.com/RunnymedeRobotics1310/RavenEye/commit/798f6363cf0641a64eb422db31eb056c2aa3f2bb))
* Save quick comments ([87d720d](https://github.com/RunnymedeRobotics1310/RavenEye/commit/87d720d14b70be044d6bd8fd4c949f901e0815ba))

## [3.2.2](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.2.1...v3.2.2) (2026-01-09)


### Bug Fixes

* clean up error handling in rbauth.ts ([64ad07e](https://github.com/RunnymedeRobotics1310/RavenEye/commit/64ad07edcc87856dbf35a747a04799ca40e296c0))
* Don't pre-load login - browser options configured to do this now. ([bebd207](https://github.com/RunnymedeRobotics1310/RavenEye/commit/bebd2072dcecf71273814385e5815289270a14f9))
* review comments - var name cleanup and log stmt removal ([e74a9b5](https://github.com/RunnymedeRobotics1310/RavenEye/commit/e74a9b5b81722afda16263e5008a1343abcf370d))
* Standardize login logic ([6e47f5b](https://github.com/RunnymedeRobotics1310/RavenEye/commit/6e47f5bf57800dd026e568ab30968fff01d3bfc7))
* typescript bug related to scout name ([8a82b62](https://github.com/RunnymedeRobotics1310/RavenEye/commit/8a82b62681c01352736a713682fcefab24d2a426))

## [3.2.1](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.2.0...v3.2.1) (2026-01-09)


### Bug Fixes

* Simplify RavenBrain communication layer ([ae7e3fd](https://github.com/RunnymedeRobotics1310/RavenEye/commit/ae7e3fd68be6821c7adeeff28815799a0ebfd635))

# [3.2.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.1.0...v3.2.0) (2026-01-09)


### Bug Fixes

* add a small margin above the footer ([13fb897](https://github.com/RunnymedeRobotics1310/RavenEye/commit/13fb8977f85c86ccf52a6fa0d15a5031fd8f215b))
* add disabled to sequence type ([d8081c7](https://github.com/RunnymedeRobotics1310/RavenEye/commit/d8081c7c769cbfe81e94817dbe6b7a4b3393fb59))
* add frcyear to sequence type ([8fb5d05](https://github.com/RunnymedeRobotics1310/RavenEye/commit/8fb5d05469ed7c08456bc8c1dae1dd85305c8a77))
* add function to return event types by year ([e6775f7](https://github.com/RunnymedeRobotics1310/RavenEye/commit/e6775f78975ddc498edef0df345cb9cdfb36a2e9))
* Add id to sequence type ([67afd45](https://github.com/RunnymedeRobotics1310/RavenEye/commit/67afd4595b5e73efaebf7832cbb3baf3be2f5b4c))
* add manual sync button ([7c7b38e](https://github.com/RunnymedeRobotics1310/RavenEye/commit/7c7b38e98f8e0b85126b729bedf14f7e21f75bd0))
* Add title to layout ([d5c7209](https://github.com/RunnymedeRobotics1310/RavenEye/commit/d5c7209baf68c35e17c384f7cc9a0ebef220cbec))
* Better sync error formatting ([286eb60](https://github.com/RunnymedeRobotics1310/RavenEye/commit/286eb608a32302024d681d93ef84f6a88d1139a9))
* Better sync in progress color ([531f115](https://github.com/RunnymedeRobotics1310/RavenEye/commit/531f1151344e557e3b32c3836c2f0b4a6b9f3bf8))
* Clean up duplicate sync issue ([0d13856](https://github.com/RunnymedeRobotics1310/RavenEye/commit/0d1385693455387889289252d5a07ccffd5fbee4))
* clean up sync screen ([d97ac9d](https://github.com/RunnymedeRobotics1310/RavenEye/commit/d97ac9d9cd1fbade93ecd711b8b78843c1ee53e4))
* clean up sync screen ([6304e18](https://github.com/RunnymedeRobotics1310/RavenEye/commit/6304e18e461088e7ac94e67414d572733a02da11))
* create and update sequence types apis ([8854450](https://github.com/RunnymedeRobotics1310/RavenEye/commit/8854450f9c00c6bc825b2be36a79ee40b05daae1))
* create and update sequence types UI ([4977407](https://github.com/RunnymedeRobotics1310/RavenEye/commit/4977407df2823e9cfb91b711567db63c43888fc0))
* Disable dark mode for screens under 320px ([09a3d03](https://github.com/RunnymedeRobotics1310/RavenEye/commit/09a3d0371da98deb6675122ff61bcb2a17549daf))
* don't mix up loading with inProgress in sync functions ([721d463](https://github.com/RunnymedeRobotics1310/RavenEye/commit/721d463e1f67afa3913b3ce51ccc9abcf3ca3dda))
* filter events by year ([3d21e27](https://github.com/RunnymedeRobotics1310/RavenEye/commit/3d21e274b616e2231c54a73f7ec8c42513bcf5d3))
* Improve ping semantics and clean up logging ([f42e767](https://github.com/RunnymedeRobotics1310/RavenEye/commit/f42e767585cafa3955f880fc1c486775c4db46f8))
* Only sync if ping succeeds ([747397a](https://github.com/RunnymedeRobotics1310/RavenEye/commit/747397aa4b737a78da6878f4bf0098e8c2549633))
* Remove unused "saveTournament" function - tournaments only sync from FIRST. ([fe61d94](https://github.com/RunnymedeRobotics1310/RavenEye/commit/fe61d940e19d9bcb6b8d80c8f72472d1fca8e395))
* Remove unused debug menu ([ce15e85](https://github.com/RunnymedeRobotics1310/RavenEye/commit/ce15e8535ecb62997ad44077651ef4df756174d8))
* remove unused file ([de97252](https://github.com/RunnymedeRobotics1310/RavenEye/commit/de97252a9d62a74dfe27eae54748644dfd40fcf5))
* Remove unused parameter ([a935841](https://github.com/RunnymedeRobotics1310/RavenEye/commit/a9358415df6779a7270531d09f340e0fe1433200))
* show disabled items in grey ([58af57c](https://github.com/RunnymedeRobotics1310/RavenEye/commit/58af57c60103814106a32efd27136d642af0afd0))
* Spin sync icon when synchronizing ([031ed02](https://github.com/RunnymedeRobotics1310/RavenEye/commit/031ed02f5f767c023b5479613b48ef4393db6ea9))
* Sync status icon top margin/padding set to 0 in the sync layout ([8e37927](https://github.com/RunnymedeRobotics1310/RavenEye/commit/8e37927bff112bfabee927dd1bae6a0c17251629))
* update dummy data to render "not yet implemented" error ([603a818](https://github.com/RunnymedeRobotics1310/RavenEye/commit/603a8185e04d370f5e9d1c333b1f9bda83310d75))


### Features

* Add EventType type and a fetch function for it ([08953cf](https://github.com/RunnymedeRobotics1310/RavenEye/commit/08953cfd58106f5d799fd3576458acea5a451558))
* fetch sequence type method ([77f2828](https://github.com/RunnymedeRobotics1310/RavenEye/commit/77f28286f741c76a843293624bf018f01f5071be))
* Implement strategy area sync ([1c1607e](https://github.com/RunnymedeRobotics1310/RavenEye/commit/1c1607e37c071bdcb1e8d5e3715ea090d820f531))
* RBScheduleRecord interface and fetch method ([5b34a85](https://github.com/RunnymedeRobotics1310/RavenEye/commit/5b34a85a999bf871f4ff4afcda924d37f9c9f382))
* Sequence sync logic ([300330a](https://github.com/RunnymedeRobotics1310/RavenEye/commit/300330ac098a746cefcd91ea9e1934aec64407af))
* SequenceType and SequenceEvent types ([9265069](https://github.com/RunnymedeRobotics1310/RavenEye/commit/926506920e7bc3f79cb753fa3dd054c5df7b8c66))
* Structure and layout for sync status page ([f5f12d3](https://github.com/RunnymedeRobotics1310/RavenEye/commit/f5f12d3ed1f44d510e9fec150cf27eda86152702))
* Sync event types ([7a5f2d8](https://github.com/RunnymedeRobotics1310/RavenEye/commit/7a5f2d8021458139361bd2532c84094f36f30b9c))
* sync match schedule ([ac60e6a](https://github.com/RunnymedeRobotics1310/RavenEye/commit/ac60e6a708c268cdafa08f902c32e52d1240fd97))
* tournament list sync completion ([afc62ee](https://github.com/RunnymedeRobotics1310/RavenEye/commit/afc62eefd0d1bd87083086b22f166489bcd5f4de))
* tournament list sync WIP ([a372704](https://github.com/RunnymedeRobotics1310/RavenEye/commit/a3727040c91ee8937a1e71781d8719671d11b082))

# [3.1.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v3.0.0...v3.1.0) (2026-01-05)


### Bug Fixes

* Switch to text area for description ([917f06d](https://github.com/RunnymedeRobotics1310/RavenEye/commit/917f06db3e90f50719bfe479d862f9204dcdbdd3))
* Update instructions for strategy area ([6b7ae8d](https://github.com/RunnymedeRobotics1310/RavenEye/commit/6b7ae8d4b5d4553f8b86aa270b3b25d2b15d049c))
* Update log msg ([da24a26](https://github.com/RunnymedeRobotics1310/RavenEye/commit/da24a268c7d745ec699a61194276022de6a77601))


### Features

* Create strategy area ([3f9e785](https://github.com/RunnymedeRobotics1310/RavenEye/commit/3f9e785e303e79bdef95c25c78a59024f9740484))
* Edit strategy area ([3b34ead](https://github.com/RunnymedeRobotics1310/RavenEye/commit/3b34ead4f8864411bfff09078ce9141082b46352))
* List strategy areas ([37cbe00](https://github.com/RunnymedeRobotics1310/RavenEye/commit/37cbe00d3ef912a4416442347f280b12c27299c3))

# [3.0.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v2.6.0...v3.0.0) (2026-01-04)


### Build System

* Add NPM plugin to trigger automatic package-lock version updates ([75456e9](https://github.com/RunnymedeRobotics1310/RavenEye/commit/75456e9e1c4223abeee40954456ca90a02241b36))
* Switch package private flag to true to prevent automatic publishes to npm registry ([e020e35](https://github.com/RunnymedeRobotics1310/RavenEye/commit/e020e3535a870327ec2707c845d8a4a5c5368f62))


### BREAKING CHANGES

* Brand new front-end for 2026 season
* Brand new front-end for 2026 season

# [2.6.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v2.5.0...v2.6.0) (2026-01-04)


### Bug Fixes

* create admin page and link to user admin section ([eed9214](https://github.com/RunnymedeRobotics1310/RavenEye/commit/eed921404cc672e05be6062b44a1bfcf9769dd6e))
* remove suppress login (co-coded with Quentin during review) ([2ab9f91](https://github.com/RunnymedeRobotics1310/RavenEye/commit/2ab9f914298d3d3e87403f63c44b83f6c1ec5296))


### Features

* Display user list ([743c578](https://github.com/RunnymedeRobotics1310/RavenEye/commit/743c578c6c2a7f90878181cc274f9aca145b7f9a))

# [2.5.0](https://github.com/RunnymedeRobotics1310/RavenEye/compare/v2.4.0...v2.5.0) (2026-01-04)


### Bug Fixes

* Preload image links. ([f6ac1c4](https://github.com/RunnymedeRobotics1310/RavenEye/commit/f6ac1c4c8c9490b58b644a90e2c966c1e8432890))
* Remove mention of locally-saved password - new login system will replace this. ([04c3e2c](https://github.com/RunnymedeRobotics1310/RavenEye/commit/04c3e2c989d00043aac18fe204e2a16ef5797d5e))
* Switched page layouts to require routes to display <main> and added conditional logic to RequireLogin to show the login form if desired. ([1a80478](https://github.com/RunnymedeRobotics1310/RavenEye/commit/1a80478275eadc4dd7f756392883a6bcd7947c29))


### Features

* add sync page ([9a347c1](https://github.com/RunnymedeRobotics1310/RavenEye/commit/9a347c1b00602dd4d067ef51ad87d636beb737ad))
* Header buttons for "back to home" and "sync" ([6b6334f](https://github.com/RunnymedeRobotics1310/RavenEye/commit/6b6334fdf2e6395ad806bfffcf34b431b1901958))
* Login form ([aaeb22e](https://github.com/RunnymedeRobotics1310/RavenEye/commit/aaeb22e730e8eb8d51e444eb2855bed933db7d4b))

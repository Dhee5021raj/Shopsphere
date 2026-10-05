# mongo-pt robustness results

> **Environment**
> mongod 8.2.6 | 16-core AMD Ryzen 7 7735HS with Radeon Graphics         | 15.19 GB RAM (3.7 GB free) | win32 10.0.26200 | Node v22.19.0
> scale=small runs=2 caps=[10000, 50000, 200000] bloom=false timeout=8000ms
> other heavy processes: Memory Compression (0.95 GB); chrome.exe (0.75 GB); chrome.exe (0.58 GB); mongod-x64-win32-8.2.6.exe (1.11 GB)
Generated 2026-10-05T05:32:55.446Z from `server/logs/pt-log.jsonl`.

## Per-query summary (total time = transfer + materialization + join)

| spec | orders | naive median | naive min/max | naive gap | exact median | exact min/max | exact gap | transfer (ms) | mat. (ms) |
|---|---|---|---|---|---|---|---|---|---|
| rare_category_revenue_7d | 4 | 5754 | 321/5870 | 18.32 | 3 | 2/4 | 1.75 | 182 | 113 |
| common_category_revenue_365d | 4 | 8000 | 8000/8000 | 1 | 4208 | 3558/4858 | 1.37 | 562 | 505 |
| vendor_scoped_revenue_90d | 6 | 7330 | 2613/8000 | 3.06 | 541 | 392/595 | 1.52 | 1622 | 210 |
| user_scoped_spend_30d | 6 | 3200 | 2/8000 | 5333.33 | 2 | 1/2 | 2 | 387 | 72 |
| low_rating_reviews_by_category | 6 | 624 | 472/743 | 1.58 | 509 | 377/543 | 1.44 | 278 | 129 |
| vendor_category_revenue_365d | 4 | 8000 | 3090/8000 | 2.59 | 2802 | 1764/3284 | 1.86 | 505 | 342 |
| user_vendor_category_spend_30d | 4 | 891 | 553/8000 | 14.47 | 3 | 3/4 | 1.6 | 731 | 124 |

## Cap sweep (which transfer edges get skipped)

| spec | mode | cap | transfer ms | mat ms | skipped edges |
|---|---|---|---|---|---|
| rare_category_revenue_7d | exact | 10000 | 182 | 113 | (none) |
| rare_category_revenue_7d | exact | 50000 | 108 | 115 | (none) |
| rare_category_revenue_7d | exact | 200000 | 129 | 108 | (none) |
| common_category_revenue_365d | exact | 10000 | 562 | 505 | oi<-o, o<-oi |
| common_category_revenue_365d | exact | 50000 | 2116 | 567 | (none) |
| common_category_revenue_365d | exact | 200000 | 2506 | 571 | (none) |
| vendor_scoped_revenue_90d | exact | 10000 | 1622 | 210 | (none) |
| vendor_scoped_revenue_90d | exact | 50000 | 1441 | 198 | (none) |
| vendor_scoped_revenue_90d | exact | 200000 | 1243 | 144 | (none) |
| user_scoped_spend_30d | exact | 10000 | 387 | 72 | (none) |
| user_scoped_spend_30d | exact | 50000 | 397 | 76 | (none) |
| user_scoped_spend_30d | exact | 200000 | 409 | 71 | (none) |
| low_rating_reviews_by_category | exact | 10000 | 278 | 129 | (none) |
| low_rating_reviews_by_category | exact | 50000 | 240 | 125 | (none) |
| low_rating_reviews_by_category | exact | 200000 | 255 | 133 | (none) |
| vendor_category_revenue_365d | exact | 10000 | 505 | 342 | oi<-o |
| vendor_category_revenue_365d | exact | 50000 | 1118 | 329 | (none) |
| vendor_category_revenue_365d | exact | 200000 | 1227 | 370 | (none) |
| user_vendor_category_spend_30d | exact | 10000 | 731 | 124 | (none) |
| user_vendor_category_spend_30d | exact | 50000 | 632 | 115 | (none) |
| user_vendor_category_spend_30d | exact | 200000 | 702 | 113 | (none) |

## Where it did NOT help

- **low_rating_reviews_by_category**: reduced total 916 ms >= naive 624 ms (transfer+mat overhead 407 ms; transfer overhead is reported separately, never hidden).

## Per-join-order detail

| spec | order | naive med (ms) | exact med (ms) | bloom med (ms) | transfer | mat | total | equal |
|---|---|---|---|---|---|---|---|---|
| rare_category_revenue_7d | `oi>o>p>v>cat` | 5788 | 4 | - | 182 | 113 | 299 | ok |
| rare_category_revenue_7d | `p>oi>o>cat>v` | 5870 | 3 | - | 182 | 113 | 298 | ok |
| rare_category_revenue_7d | `p>cat>oi>v>o` | 321 | 3 | - | 182 | 113 | 298 | ok |
| rare_category_revenue_7d | `oi>o>v>p>cat` | 5721 | 2 | - | 182 | 113 | 297 | ok |
| common_category_revenue_365d | `oi>o>p>v>cat` | - | 4858 | - | 562 | 505 | 5925 | TIMEOUT |
| common_category_revenue_365d | `p>oi>o>cat>v` | - | 3558 | - | 562 | 505 | 4625 | TIMEOUT |
| vendor_scoped_revenue_90d | `v>oi>p>o` | 2613 | 392 | - | 1622 | 210 | 2224 | ok |
| vendor_scoped_revenue_90d | `oi>p>v>o` | - | 595 | - | 1622 | 210 | 2427 | TIMEOUT |
| vendor_scoped_revenue_90d | `oi>v>p>o` | 7330 | 541 | - | 1622 | 210 | 2373 | ok |
| user_scoped_spend_30d | `o>u>oi>p` | 89 | 1 | - | 387 | 72 | 460 | ok |
| user_scoped_spend_30d | `o>oi>u>p` | 567 | 2 | - | 387 | 72 | 461 | ok |
| user_scoped_spend_30d | `oi>p>o>u` | - | 2 | - | 387 | 72 | 461 | TIMEOUT |
| user_scoped_spend_30d | `oi>o>u>p` | 5834 | 2 | - | 387 | 72 | 461 | ok |
| user_scoped_spend_30d | `u>o>oi>p` | 2 | 2 | - | 387 | 72 | 461 | ok |
| user_scoped_spend_30d | `p>oi>o>u` | 6081 | 2 | - | 387 | 72 | 461 | ok |
| low_rating_reviews_by_category | `r>p>v>c` | 472 | 517 | - | 278 | 129 | 924 | ok |
| low_rating_reviews_by_category | `p>v>r>c` | 688 | 500 | - | 278 | 129 | 907 | ok |
| low_rating_reviews_by_category | `p>r>v>c` | 691 | 519 | - | 278 | 129 | 926 | ok |
| low_rating_reviews_by_category | `p>c>r>v` | 560 | 441 | - | 278 | 129 | 848 | ok |
| low_rating_reviews_by_category | `c>p>r>v` | 538 | 377 | - | 278 | 129 | 784 | ok |
| low_rating_reviews_by_category | `p>r>c>v` | 743 | 543 | - | 278 | 129 | 950 | ok |
| vendor_category_revenue_365d | `oi>p>o>v>c` | - | 3284 | - | 505 | 342 | 4131 | TIMEOUT |
| vendor_category_revenue_365d | `p>oi>v>o>c` | - | 2802 | - | 505 | 342 | 3649 | TIMEOUT |
| vendor_category_revenue_365d | `p>v>oi>o>c` | 3090 | 1764 | - | 505 | 342 | 2611 | ok |
| user_vendor_category_spend_30d | `o>oi>u>v>p>c` | 553 | 3 | - | 731 | 124 | 858 | ok |
| user_vendor_category_spend_30d | `o>oi>p>u>v>c` | 792 | 3 | - | 731 | 124 | 858 | ok |
| user_vendor_category_spend_30d | `oi>v>o>u>p>c` | - | 4 | - | 731 | 124 | 859 | TIMEOUT |
| user_vendor_category_spend_30d | `o>oi>p>v>c>u` | 990 | 3 | - | 731 | 124 | 858 | ok |

## Specs

- **rare_category_revenue_7d** — 28 valid orders, tested 4; sizes {"cat":1,"p":3000,"oi":47987,"o":228,"v":20}
- **common_category_revenue_365d** — 28 valid orders, tested 4; sizes {"cat":1,"p":3000,"oi":47987,"o":12000,"v":20}
- **vendor_scoped_revenue_90d** — 12 valid orders, tested 6; sizes {"v":1,"oi":47987,"o":3051,"p":3000}
- **user_scoped_spend_30d** — 8 valid orders, tested 6; sizes {"u":1,"o":1016,"oi":47987,"p":3000}
- **low_rating_reviews_by_category** — 12 valid orders, tested 6; sizes {"r":3217,"p":3000,"c":12,"v":20}
- **vendor_category_revenue_365d** — 28 valid orders, tested 4; sizes {"v":1,"p":3000,"oi":47987,"o":12000,"c":12}
- **user_vendor_category_spend_30d** — 72 valid orders, tested 4; sizes {"u":1,"o":1015,"oi":47987,"p":3000,"v":20,"c":12}

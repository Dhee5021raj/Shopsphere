# mongo-pt robustness results

> **Environment**
> mongod 8.2.6 | 16-core AMD Ryzen 7 7735HS with Radeon Graphics         | 15.19 GB RAM (4.59 GB free) | win32 10.0.26200 | Node v22.19.0
> scale=small runs=2 caps=[10000, 50000, 200000] bloom=false timeout=8000ms
> other heavy processes: Memory Compression (1.13 GB); chrome.exe (0.58 GB); chrome.exe (0.86 GB); chrome.exe (0.53 GB)
Generated 2026-10-05T05:09:57.768Z from `server/logs/pt-log.jsonl`.

## Per-query summary (total time = transfer + materialization + join)

| spec | orders | naive median | naive min/max | naive gap | exact median | exact min/max | exact gap | transfer (ms) | mat. (ms) |
|---|---|---|---|---|---|---|---|---|---|
| rare_category_revenue_7d | 4 | 5902 | 369/6224 | 16.89 | 2 | 2/3 | 1.25 | 73 | 108 |
| common_category_revenue_365d | 4 | 8000 | 8000/8000 | 1 | 4196 | 3815/4578 | 1.2 | 590 | 554 |
| vendor_scoped_revenue_90d | 6 | 7832 | 2621/8000 | 3.05 | 506 | 386/582 | 1.51 | 905 | 212 |
| user_scoped_spend_30d | 6 | 3060 | 2/8000 | 5333.33 | 2 | 1/3 | 2.5 | 270 | 72 |
| low_rating_reviews_by_category | 6 | 651 | 508/758 | 1.49 | 519 | 404/568 | 1.41 | 170 | 142 |
| vendor_category_revenue_365d | 4 | 8000 | 3158/8000 | 2.53 | 2543 | 1811/3143 | 1.74 | 349 | 292 |
| user_vendor_category_spend_30d | 4 | 990 | 582/8000 | 13.75 | 2 | 2/3 | 1.25 | 573 | 126 |

## Cap sweep (which transfer edges get skipped)

| spec | mode | cap | transfer ms | mat ms | skipped edges |
|---|---|---|---|---|---|
| rare_category_revenue_7d | exact | 10000 | 73 | 108 | (none) |
| rare_category_revenue_7d | exact | 50000 | 52 | 99 | (none) |
| rare_category_revenue_7d | exact | 200000 | 53 | 102 | (none) |
| common_category_revenue_365d | exact | 10000 | 590 | 554 | oi<-o, o<-oi |
| common_category_revenue_365d | exact | 50000 | 1294 | 518 | (none) |
| common_category_revenue_365d | exact | 200000 | 1443 | 521 | (none) |
| vendor_scoped_revenue_90d | exact | 10000 | 905 | 212 | (none) |
| vendor_scoped_revenue_90d | exact | 50000 | 927 | 159 | (none) |
| vendor_scoped_revenue_90d | exact | 200000 | 592 | 186 | (none) |
| user_scoped_spend_30d | exact | 10000 | 270 | 72 | (none) |
| user_scoped_spend_30d | exact | 50000 | 287 | 73 | (none) |
| user_scoped_spend_30d | exact | 200000 | 278 | 69 | (none) |
| low_rating_reviews_by_category | exact | 10000 | 170 | 142 | (none) |
| low_rating_reviews_by_category | exact | 50000 | 178 | 154 | (none) |
| low_rating_reviews_by_category | exact | 200000 | 152 | 142 | (none) |
| vendor_category_revenue_365d | exact | 10000 | 349 | 292 | oi<-o |
| vendor_category_revenue_365d | exact | 50000 | 678 | 347 | (none) |
| vendor_category_revenue_365d | exact | 200000 | 731 | 312 | (none) |
| user_vendor_category_spend_30d | exact | 10000 | 573 | 126 | (none) |
| user_vendor_category_spend_30d | exact | 50000 | 417 | 125 | (none) |
| user_vendor_category_spend_30d | exact | 200000 | 389 | 118 | (none) |

## Where it did NOT help

- **low_rating_reviews_by_category**: reduced total 831 ms >= naive 651 ms (transfer+mat overhead 312 ms; transfer overhead is reported separately, never hidden).

## Per-join-order detail

| spec | order | naive med (ms) | exact med (ms) | bloom med (ms) | transfer | mat | total | equal |
|---|---|---|---|---|---|---|---|---|
| rare_category_revenue_7d | `oi>o>p>v>cat` | 5881 | 2 | - | 73 | 108 | 183 | ok |
| rare_category_revenue_7d | `p>oi>o>cat>v` | 6224 | 2 | - | 73 | 108 | 183 | ok |
| rare_category_revenue_7d | `p>cat>oi>v>o` | 369 | 3 | - | 73 | 108 | 184 | ok |
| rare_category_revenue_7d | `oi>o>v>p>cat` | 5924 | 3 | - | 73 | 108 | 184 | ok |
| common_category_revenue_365d | `oi>o>p>v>cat` | - | 4578 | - | 590 | 554 | 5722 | TIMEOUT |
| common_category_revenue_365d | `p>oi>o>cat>v` | - | 3815 | - | 590 | 554 | 4959 | TIMEOUT |
| vendor_scoped_revenue_90d | `v>oi>p>o` | 2621 | 386 | - | 905 | 212 | 1503 | ok |
| vendor_scoped_revenue_90d | `oi>p>v>o` | - | 506 | - | 905 | 212 | 1623 | TIMEOUT |
| vendor_scoped_revenue_90d | `oi>v>p>o` | 7832 | 582 | - | 905 | 212 | 1699 | ok |
| user_scoped_spend_30d | `o>u>oi>p` | 117 | 2 | - | 270 | 72 | 344 | ok |
| user_scoped_spend_30d | `o>oi>u>p` | 562 | 2 | - | 270 | 72 | 344 | ok |
| user_scoped_spend_30d | `oi>p>o>u` | - | 3 | - | 270 | 72 | 345 | TIMEOUT |
| user_scoped_spend_30d | `oi>o>u>p` | 5558 | 2 | - | 270 | 72 | 344 | ok |
| user_scoped_spend_30d | `u>o>oi>p` | 2 | 1 | - | 270 | 72 | 343 | ok |
| user_scoped_spend_30d | `p>oi>o>u` | 6214 | 2 | - | 270 | 72 | 344 | ok |
| low_rating_reviews_by_category | `r>p>v>c` | 508 | 526 | - | 170 | 142 | 838 | ok |
| low_rating_reviews_by_category | `p>v>r>c` | 758 | 486 | - | 170 | 142 | 798 | ok |
| low_rating_reviews_by_category | `p>r>v>c` | 654 | 568 | - | 170 | 142 | 880 | ok |
| low_rating_reviews_by_category | `p>c>r>v` | 647 | 514 | - | 170 | 142 | 826 | ok |
| low_rating_reviews_by_category | `r>p>c>v` | 537 | 525 | - | 170 | 142 | 837 | ok |
| low_rating_reviews_by_category | `p>v>c>r` | 720 | 404 | - | 170 | 142 | 716 | ok |
| vendor_category_revenue_365d | `oi>p>o>v>c` | - | 3143 | - | 349 | 292 | 3784 | TIMEOUT |
| vendor_category_revenue_365d | `p>oi>v>o>c` | - | 2543 | - | 349 | 292 | 3184 | TIMEOUT |
| vendor_category_revenue_365d | `p>v>oi>o>c` | 3158 | 1811 | - | 349 | 292 | 2452 | ok |
| user_vendor_category_spend_30d | `o>oi>u>v>p>c` | 582 | 3 | - | 573 | 126 | 702 | ok |
| user_vendor_category_spend_30d | `o>oi>p>u>v>c` | 800 | 2 | - | 573 | 126 | 701 | ok |
| user_vendor_category_spend_30d | `oi>v>o>u>p>c` | - | 2 | - | 573 | 126 | 701 | TIMEOUT |
| user_vendor_category_spend_30d | `o>oi>p>v>c>u` | 1180 | 2 | - | 573 | 126 | 701 | ok |

## Specs

- **rare_category_revenue_7d** — 28 valid orders, tested 4; sizes {"cat":1,"p":3000,"oi":47987,"o":228,"v":20}
- **common_category_revenue_365d** — 28 valid orders, tested 4; sizes {"cat":1,"p":3000,"oi":47987,"o":12000,"v":20}
- **vendor_scoped_revenue_90d** — 12 valid orders, tested 6; sizes {"v":1,"oi":47987,"o":3051,"p":3000}
- **user_scoped_spend_30d** — 8 valid orders, tested 6; sizes {"u":1,"o":1015,"oi":47987,"p":3000}
- **low_rating_reviews_by_category** — 12 valid orders, tested 6; sizes {"r":3217,"p":3000,"c":12,"v":20}
- **vendor_category_revenue_365d** — 28 valid orders, tested 4; sizes {"v":1,"p":3000,"oi":47987,"o":12000,"c":12}
- **user_vendor_category_spend_30d** — 72 valid orders, tested 4; sizes {"u":1,"o":1015,"oi":47987,"p":3000,"v":20,"c":12}

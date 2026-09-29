#import "../../style.typ": template
#import "../../utils.typ": blueblack, hr

#show: template

#set document(
  title: "记忆化搜索",
  author: "mag1cian",
)

#align(center)[
  #text(size: 20pt, weight: "bold")[
    记忆化搜索
  ]
]

#v(1em)

写 dfs 加入 cache，让一个状态就只计算一次。
要证明的是：

# [  
\left\lceil \frac{a}{x} \right\rceil

\left\lfloor \frac{a-1}{x} \right\rfloor + 1  
]

这里假设：

[  
a>0,\quad x>0  
]

Python 的 `//` 对正数就是向下取整，所以代码里是：

```python
(a - 1) // x + 1
```

## 用商和余数证明

根据整数除法，任意正整数 `a` 都可以写成：

[  
a = qx + r  
]

其中：

[  
0 \le r < x  
]

分两种情况。

### 情况一：刚好整除

即：

[  
r=0  
]

那么：

[  
a=qx  
]

所以：

[  
\left\lceil \frac{a}{x} \right\rceil=q  
]

再看右边：

[  
a-1=qx-1=(q-1)x+(x-1)  
]

因为：

[  
0\le x-1<x  
]

所以：

[  
\left\lfloor \frac{a-1}{x} \right\rfloor=q-1  
]

因此：

[  
\left\lfloor \frac{a-1}{x} \right\rfloor+1=q  
]

两边相等。

例如：

```text
a = 12, x = 3
ceil(12 / 3) = 4
(12 - 1) // 3 + 1 = 11 // 3 + 1 = 3 + 1 = 4
```

---

### 情况二：不能整除

即：

[  
1\le r<x  
]

这时：

[  
\frac{a}{x}=q+\frac{r}{x}  
]

其中：

[  
0<\frac{r}{x}<1  
]

所以：

[  
\left\lceil \frac{a}{x} \right\rceil=q+1  
]

再看右边：

[  
a-1=qx+(r-1)  
]

因为：

[  
0\le r-1<x  
]

所以：

[  
\left\lfloor \frac{a-1}{x} \right\rfloor=q  
]

因此：

[  
\left\lfloor \frac{a-1}{x} \right\rfloor+1=q+1  
]

仍然相等。

例如：

```text
a = 10, x = 3
ceil(10 / 3) = 4
(10 - 1) // 3 + 1 = 9 // 3 + 1 = 3 + 1 = 4
```

## 直觉理解

`a / x` 向上取整，本质上是在问：

> 至少需要几个 `x`，才能覆盖 `a`？

把 `a` 先减 1：

```text
a - 1
```

可以把每一组表示成：

```text
1 ~ x       属于第 1 组
x+1 ~ 2x    属于第 2 组
2x+1 ~ 3x   属于第 3 组
```

例如 `x = 3`：

```text
a:              1 2 3 | 4 5 6 | 7 8 9 | 10 11 12
ceil(a / 3):    1 1 1 | 2 2 2 | 3 3 3 | 4  4  4
```

而：

```text
(a - 1) // 3 + 1
```

正好也是这样分组：

```text
a - 1:          0 1 2 | 3 4 5 | 6 7 8 | 9 10 11
// 3:           0 0 0 | 1 1 1 | 2 2 2 | 3  3  3
+ 1:            1 1 1 | 2 2 2 | 3 3 3 | 4  4  4
```

所以：

```python
(a - 1) // x + 1
```

就是正整数除法向上取整。

还有一个更常见的等价写法：

```python
(a + x - 1) // x
```

因为：

# [  
\frac{a-1}{x}+1

\frac{a+x-1}{x}  
]

对应整数除法时：

```python
(a - 1) // x + 1 == (a + x - 1) // x
```

前提仍然是 `a > 0`、`x > 0`。
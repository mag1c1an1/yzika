#import "../style.typ": template
#import "../utils.typ": blueblack, hr

#show: template

*随机实验（Random Experiment）*

1. 可在相同条件下重复执行（repeatable under identical conditions）
2. 事先知道所有可能结果（all possible outcomes are known in advance）
3. 单次执行前无法确定具体哪个结果会出现（the exact outcome is unpredictable before a single trial）

*样本空间（Sample Space）*

随机试验所有可能结果构成的集合，记作 $Omega$

要求：非负，和为 1

#quote(block: true)[
  Technically, $PP$ is a real-valued function on a certain collection of subsets of $Omega$, and is called probability measure. (测度论的详细定义太复杂了, 这里就不写了)
]

*样本点（Sample Point）*

随机试验的一个具体可能结果，是样本空间 $Omega$ 的一个元素

*事件（Event）*

样本空间 $Omega$ 的一个子集，即若干样本点组成的集合，记作 $A subset.eq Ω$

*条件概率（Conditional Probability）*

设 $A$ 和 $B$ 是样本空间 $Omega$ 中的两个事件，并且$P(B) > 0$。那么，在事件 $B$ 已经发生的条件下，事件 $A$ 发生的条件概率定义为： $ P(A|B) := frac(P(A inter B ), P(B)) $

已知事件 $B$ 已经发生后，我们不再考虑整个样本空间 $Omega$，而只考虑事件 $B$ 中包含的样本点。因此，事件 $B$ 成为新的样本空间。但是，事件 $B$ 中所有样本点原来的概率之和是 $P(B)$，而不是 $1$。为了使新的样本空间中所有概率之和等于$1$，需要将这些概率统一除以 $P(B)$，也就是进行归一化。在新的样本空间 $B$ 中，事件 $A$ 真正对应的部分是：$A inter B$。

+ 为什么可以归一化？
  
  设 $B$ 是一个满足 $P(B) > 0$ 的事件。已知事件 $B$ 已经发生后，我们只考虑 $B$ 中的结果。把原概率限制在 $B$ 上，可以定义一个有限测度：
  $
    mu_B(A) := P(A inter B)
  $
  它的总质量为：
  $
    mu_B(Omega) = P(Omega inter B) = P(B)
  $
  由于 $P(B)$ 不一定等于 $1$，所以 $mu_B$ 还不是概率测度。为了使其总质量变成 $1$，定义：
  $
    Q(A):= frac(mu_B(A), mu_B(Omega)) = frac(P(A inter B), P(B))
  $
  这个过程称为归一化。

+ 为什么除以 $P(B)$？
  
  假设我们只想统一缩放 $B$ 中所有结果的概率，而不改变它们原来的相对比例。
  
  因此，新的概率应具有下面的形式：
  
  $ Q(A) = c P(A) quad (A subset.eq B ) $
  
  其中 $c$ 是所有事件共同使用的缩放常数。因为在新的概率空间中，$B$ 是整个样本空间，所以必须满足：
  
  $ Q(B) = 1 $
  
  代入 $Q(B) = c P(B)$，得到：
  $ c P(B) = 1 $
  
  因此：
  $ c = frac(1, P(B)) $
  所以归一化因子只能是：
  $ frac(1, P(B)) $
  对于任意事件 $A$，已知 $B$ 发生后，真正需要考虑的部分是 $A inter B$，因此：
  $ Q(A) = frac(P(A inter B), P(B)) $
  这就是条件概率：
  $ P(A | B) := frac(P(A inter B), P(B)) $
+ 归一化后为什么仍然是概率？
  
  要成为概率测度，$Q$ 必须满足概率公理。
  
  + 非负性
    
    因为：$ P(A inter B) >= 0 $ 并且 $P(B) > 0$，所以：$ Q(A) = frac(P(A inter B), P(B)) >= 0 $
  
  + 总概率等于 1
    
    $
      Q(Omega)
      = frac(P(Omega inter B), P(B))
      = frac(P(B), P(B))
      = 1
    $
  
  + 可数可加性
    
    若 $A_1, A_2, dots$ 两两互不相交，那么 $A_1 inter B, A_2 inter B, dots$ 也两两互不相交。因此：
    
    $ Q(union.big_(i=1)^infinity A_i)
    = frac(
      P((union.big_(i=1)^infinity A_i) inter B),
      P(B)
    )
    = sum_(i=1)^infinity frac(P(A_i inter B), P(B))
    = sum_(i=1)^infinity Q(A_i) $ 所以，归一化后的 $Q$ 确实满足概率公理。

+ 理论依据
  
  从测度论角度看，这个操作称为：
  #quote(block: true)[
    将概率测度 $P$ 限制在事件 $B$ 上，然后除以该限制测度的总质量 $P(B)$。
  ]
  一般来说，如果 $mu$ 是一个有限且非零的测度，那么：
  $
    nu(A) := frac(mu(A), mu(Omega))
  $
  一定是一个概率测度。条件概率只是令：
  
  $
    mu(A) = P(A inter B)
  $


random varible

极大似然估计



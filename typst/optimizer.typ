
#import "style.typ": template
#import "utils.typ": blueblack, hr

#show: template

= Optimizer
search space + cost estimation \
different logicial plan -> differnet physical plan operators \
transformations do not necessarily reduce cost \
cardinality, selectivity \


== Heuristics
We say that two relational algebra expressions are equivalent if they generate the same set of tuples. \
selection remain, split, precompute \
join, commutative, associative \

the number of equivalent join orderings for an n-way binary join is $O((n-1)! C_(n-1)) ≈ O((n-1)!4^n n^(-3/2))$ (where Cn is the nth Catalan number).

proof.

split the n leaves into a left group of k and a right group of n-k, at the root. \
shapes: 
$ T(n)= sum_(k=1)^(n-1) T(k) T(n-k), T(1) = 1 $
Stirling approximation



=== Ingres
Decompose into single-value queries \
Substitute the values into the queries.
This approach sidesteps the need for join algorithms, cost estimation, or statistics entirely.

== Heuristics + Cost-Based Search
cost-based search used in logical-to-physical transformations \
join algorithm, access path, materialize data

=== System R optimizer
Selectivity Factor\
interesting orders \
bottom-up dynamic programming \
left deep tree \
query block individually \
a reasonable plan \

COLUMN=VALUE assumes an even distribution of the data, and assumes the selectivity is $1/10$ if there is no index on the column.

Sargable predicates determine which index access paths are available; statistics and selectivity estimates determine how much data each path is expected to process; the cost model assigns a cost to each path; and interesting orders prevent the optimizer from prematurely pruning paths that are locally more expensive but provide useful ordering properties.

= References
#link("https://15799.courses.cs.cmu.edu/spring2025/notes/02-systemr.pdf")[Lecture 2]

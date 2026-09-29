#let template(body) = {
  set text(
    font: (
      "New Computer Modern",
      "Songti SC",
    ),
    size: 14pt,
    lang: "zh",
  )
  
  show raw: set text(
    font: (
      "Maple Mono NF",
    ),
  )
  
  show heading: set block(below: 0.8em)
  
  set enum(numbering: "(a.1)")
  set list(marker: "🐟")
  
  body
}
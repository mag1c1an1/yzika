#import "../style.typ": template
#import "../utils.typ": blueblack, hr

#show: template
*Author: mag1cian \<mag1cian\@icloud.com\>*
#hr
*Problem (unicode1):  Understanding Unicode (1 point)*

+ What Unicode character does chr(0) return?
  
  '\\x00', U+0000, NUL

+ How does this character’s string representation (`__repr__()`) differ from its printed representation?
  
  `__repr__` returns its escape sequnence, because it is a non-printable character.

+ What happens when this character occurs in text? It may be helpful to play around with the following in your Python interpreter and see if it matches your expectations:
  ```python
  >>> chr(0)
  >>> print(chr(0))
  >>> "this is a test" + chr(0) + "string"
  ```
  #blueblack[
    The null character can exist inside a Python string, where it appears as \\x00 in repr, but it is non-printable, so printing the string produces no visible character at that position.
  ]

#hr
*Problem (unicode2):  Unicode Encodings (3 points)*

+ What are some reasons to prefer training our tokenizer on UTF-8 encoded bytes, rather than UTF-16 or UTF-32? It may be helpful to compare the output of these encodings for various input strings.
  
  #blueblack[
    #{
      set enum(numbering: "1.")
      [
        + UTF-8 is the dominant text encoding used on the web and in most modern datasets, so training directly on UTF-8 avoids unnecessary conversion and is compatible with existing data pipelines.
        + UTF-8 saves space for english text.
      ]
    }
  ]

+ Consider the following (incorrect) function, which is intended to decode a UTF-8 byte string into a Unicode string. Why is this function incorrect? Provide an example of an input byte string that yields incorrect results.
  ```python
  def decode_utf8_bytes_to_str_wrong(bytestring: bytes):
      return "".join([bytes([b]).decode("utf-8") for b in bytestring])
      
  >>> decode_utf8_bytes_to_str_wrong("hello".encode("utf-8"))
  'hello'
  ```
  ```python
  >>> decode_utf8_bytes_to_str_wrong("你好".encode("utf-8"))
  Traceback (most recent call last):
  File "<python-input-8>", line 1, in <module>
  decode_utf8_bytes_to_str_wrong("你好".encode("utf-8"))
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^
  File "<python-input-5>", line 2, in decode_utf8_bytes_to_str_wrong
    return "".join([bytes([b]).decode("utf-8") for b in bytestring])
                    ~~~~~~~~~~~~~~~~~^^^^^^^^^
  UnicodeDecodeError: 'utf-8' codec can't decode byte 0xe4 in position 0: unexpected end of data
  ```
  #blueblack[
    The function incorrectly decodes each byte independently, but UTF-8 characters may consist of multiple bytes that must be decoded together.
  ]

+ Give a two-byte sequence that does not decode to any Unicode character(s).
  
  #blueblack[
    C0 80 is invalid because the first byte of a two-byte UTF-8 sequence must match the pattern 110xxxxx, which corresponds to the range 0xC2 to 0xDF.
  ]

#hr
*Problem (train_bpe_tinystories):  BPE Training on TinyStories (2 points)*

+ Train a byte-level BPE tokenizer on the TinyStories dataset, using a maximum vocabulary size of 10,000. Make sure to add the TinyStories <|endoftext|> special token to the vocabulary. Serialize the resulting vocabulary and merges to disk for further inspection. How much time and memory did training take? What is the longest token in the vocabulary? Does it make sense?
  
  *Resource requirements*: ≤ 30 minutes (no GPUs), ≤ 30 GB RAM
  
  *Hint*  You should be able to get under 2 minutes for BPE training using multiprocessing during pre-tokenization and the following two facts:
  + The <|endoftext|> token delimits documents in the data files.
  + The <|endoftext|> token is handled as a special case before the BPE merges are applied.
  
  #blueblack[_ 7.368  secs_\
    2.1G \
    b' accomplishment', b' disappointment', b' responsibility']

+ Profile your code. What part of the tokenizer training process takes the most time?
  
  #blueblack[
    Pre-tokenization cost most time in my implementaion. (7.368 / 7.65 sesc)
  ]

#hr
*Problem (train_bpe_expts_owt):  BPE Training on OpenWebText (2 points)*

+ Train a byte-level BPE tokenizer on the OpenWebText dataset, using a maximum vocabulary size of 32,000. Serialize the resulting vocabulary and merges to disk for further inspection. What is the longest token in the vocabulary? Does it make sense?
  
  *Resource requirements:* ≤ 12 hours (no GPUs), ≤ 100 GB RAM
  #blueblack[
    b'\\xc3\\x83\\xc3\\x82\\xc3\\x83\\xc3\\x82\\xc3\\x83\\xc3\\x82\\xc3\\x83\\xc3\\x82\\xc3\\x83\\xc3\\x82\\xc3
    \\x83\\xc3\\x82\\xc3\\x83\\xc3\\x82\\xc3\\x83\\xc3\\x82\\xc3\\x83\\xc3\\x82\\xc3\\x83\\xc3\\x82\\xc3\\x83
    \\xc3\\x82\\xc3\\x83\\xc3\\x82\\xc3\\x83\\xc3\\x82\\xc3\\x83\\xc3\\x82\\xc3\\x83\\xc3\\x82\\xc3\\x83\\xc3\\x82, b'----------------------------------------------------------------' \
    That's expected, since there is likely to be a lot of invalid UTF-8 data.
  ]

+ Compare and contrast the tokenizer that you get training on TinyStories versus OpenWebText.
  
  #blueblack[
    OpenWebText produces a substantially larger and more diverse vocabulary.Although the two vocabularies share 7,319 tokens, their Jaccard similarityis only 21.10%, indicating that the training corpus strongly influences the learned BPE vocabulary.
    === Vocabulary Statistics
    
    #table(
      columns: (1fr, auto, auto),
      align: (left, right, right),
      inset: (x: 8pt, y: 5pt),
      stroke: none,
      
      table.header(
        table.cell(fill: luma(235))[*Metric*],
        table.cell(fill: luma(235))[*TinyStories*],
        table.cell(fill: luma(235))[*OpenWebText*],
      ),
      
      [Vocabulary size], [10,000], [32,000],
      [Mean token length], [5.791], [6.337],
      [Median token length], [6.000], [6.000],
      [Maximum token length], [15], [64],
      [Tokens ≥ 10 bytes], [625], [4,408],
      [Tokens ≥ 20 bytes], [0], [10],
    )
    
    #v(10pt)
    
    === Vocabulary Overlap
    
    #table(
      columns: (1fr, auto),
      align: (left, right),
      inset: (x: 8pt, y: 5pt),
      stroke: none,
      
      table.header(
        table.cell(fill: luma(235))[*Metric*],
        table.cell(fill: luma(235))[*Value*],
      ),
      
      [Shared tokens], [7,319],
      [TinyStories-only tokens], [2,681],
      [OpenWebText-only tokens], [24,681],
      [Jaccard similarity], [21.10%],
    )
  ]

#hr
*Problem (tokenizer_experiments):  Experiments with tokenizers (4 points)*

+ Sample 10 documents from TinyStories and OpenWebText. Using your previously-trained TinyStories and OpenWebText tokenizers (10K and 32K vocabulary size, respectively), encode these sampled documents into integer IDs. What is each tokenizer’s compression ratio (bytes/token)?
  
  #blueblack[
    TinyStories: 4.006885593220339 \
    OpenWebText: 4.661899144795045
  ]


+ What happens if you tokenize your OpenWebText sample with the TinyStories tokenizer? Compare the compression ratio and/or qualitatively describe what happens.
  
  #blueblack[
    TinyStories: 3.933957358294332 \
    OpenWebText: 3.1766301617602735 \
    The vocabulary of TinyStores is smaller. \
    The words TinyStories uses (the, and, said, was…) are among the highest-frequency words in any English corpus, and BPE's first few thousand merges happen to be exactly "the highest-frequency substrings in the corpus." So the high-frequency merges learned by OWT still fire on story text, and compression barely degrades. \
    Web text is full of rare words, proper names, numbers, and cross-domain vocabulary. TinyStories' 10,000-merge budget was all spent on children's-story vocabulary, so when it hits OWT's long-tail words, they fragment into a large number of subwords/bytes → the token count explodes.
  ]



+ Estimate the throughput of your tokenizer (e.g., in bytes/second). How long would it take to tokenize the Pile dataset (825GB of text)?
  
  #blueblack[
    392406.05045596993 toks/sec \
  ]
  ```py
  >>> 825 * 1e9 / (4.661899144795045 * 392406.05045596993) / 86400
  5.219653059117459
  ```
  #blueblack[
    5.22 days, under the assumption of unlimited memory. \
  ]

+ Using your TinyStories and OpenWebText tokenizers, encode the respective training and development datasets into a sequence of integer token IDs. We’ll use this later to train our language model. We recommend serializing the token IDs as a NumPy array of datatype uint16. Why is uint16 an appropriate choice?
  
  #blueblack[
    Assuming no overlap between the TinyStories and OpenWebText vocabularies, the combined vocabulary size is 10,000+32,000=42,000, which fits within the range of uint16.
  ]
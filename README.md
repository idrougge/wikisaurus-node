#wikisaurus-node

A node.js script for using Wiktionary as a thesaurus.

Depends on request and promise for handling asynchronous fetching of terms from
Wiktionary's API. 

Dependencies on fs and helmet are optional.
Fs module is used for delivering a demonstration page.

Endpoints:
/synonym?term — get a random synonym
/antonym?term — get a random antonym
/opposites?term – get a random antonym-synonym pair
/all?term – get all synonyms and antonyms in JSON format

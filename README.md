# EOP-Auto-Doer
The automation working for EOP (HaUI) (someone give attention 😭)

<h1 align="center">EOP Auto Doer (Still need some attention)</h1>
<p align="center">

# Note

This things still need some of your attention by sometimes checking, answer recorrect and/or other things i forgot to add here

Come with Tesseract.js

# Working Task
 - Vocabulary (click and hear all the word): 100% working
 - Word choose (give pronoun, sound, vietnamese type and need to choose correct word in some answer): 100% working
 - Multichoice (question with... multiple choice, wdyw?): 100% working
 - Reading (there have nothing, just click next): 100% working
 - Text fill (fill the text into blank): ~~16% read wrong word, cause to 3 out of 10 task cannot be done~~ Improved preprocess image and OCR to get higher accurate (85% working)
 - Word scramble (give pronoun, sound, vietnamese type and bunch of character and need to sort it): not supported

## Tutorials

 - Download code in release.
 - Extract it somewhere on your computer.
 - Load extracted on your browser.
 - Open EOP, open task, click start.

## Known bug, milestone

 - OCR Bug:
     - In some case it will reconize "C" as "Cc" (need temp fix by change all "Cc" to "C" in code or fix OCR(impossible)) (patch released(not work lol))
     - Total OCR error:
       - "C" to "Cc" (temp fixed)
       - "g" to "a"
       - "j" to "1"
       - "i" to nothing (idk ask tesseract)
       - "rn" (in turn/internet) to "m"
       - Word got stick together ("It is" to "Itis", "AT and" to "ATand",...)
     - Also sometime misread the dot "." and other chacracters aswell! (patch released)
 - Task type:
   - Cannot work on word scramble task type (the task give a how to spell or a voice someone saying a word with a bunch of characters and force you to put the character in correct order)
   - On old task they somehow didn't use image mechanic but direct word as answer, just copy paste.
 - Stopping: the stop command still need to the run cycle to complete (?) (patch released(patch to patch the patch released))
 - Notifying: make a notify when unsupported task type or error appear
 - "cApTcHa": forgot to add a function to skip web stupid captcha (well, they don't even put a picture in their captcha lol)

## Disclaimer

### When you use this project, you accepted that you might got caught and banned from EOP, score reduce and other risk related to your studying. USE AT YOUR OWN RISK!!!

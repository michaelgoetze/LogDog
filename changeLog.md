# ChangeLog

## v0.0.11:
 - revised v0.0.10 declarativeContent is required to start the popup pageAction
 - fixed bug with sorting
 - fixed bug in changing name function

## v0.0.10:
 - removed declarativeContent permission
 - timer is only started on chrome startup, completed webnavigation and closing popup

## v0.0.9:
 - Date, player and game dropdown boxes are being sorted
 - Games can be reloaded as a new game with the same kingdom cards (no. of players by default 2)
 - When loading backups, games are checked for copies of themselves and identical log are excluded.
 - Added filter options to the popup as well
 - Fixed bug to replace Lord Rattington with Lord Rat
 - Most functions work for games with > 2 players

## v0.0.8:
 - Games sorted by date
 - Compatibility with older log backups created
 - corrected minor bugs of 0.0.7

## v0.0.7:
 - games can now be quickly loaded as bot games
 - kingdom cards are extracted from the page at the beginning of the game. (Not visible yet to the player)
 - Keys for chrome storage are now unique (multiple games with the same gameID can exist)
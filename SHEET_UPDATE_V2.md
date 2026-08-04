# Google Sheet update — Tasks V2

Only the **Tasks** tab needs a structural change.

## 1. Insert a new column C

Insert a blank column between `project_id` and `title`, then name it:

`timeline_id`

The final header order must be:

`id | project_id | timeline_id | title | assignee | due_date | status | scope`

Do not delete or rewrite the existing rows. After inserting column C, the existing task data should shift automatically to the right. Existing tasks can leave `timeline_id` blank.

## 2. New tasks

New project tasks created from the portal will store the selected Timeline row ID, for example:

`task_021 | proj_003 | timeline_014 | Prepare presentation | You | 2026-08-08 | open | this_week`

Studio/internal tasks use:

`task_022 | studio |  | Renew LLC | You | 2026-08-10 | open | this_week`

## 3. No other sheet changes

The `Projects`, `Timeline`, `Team`, and other tabs stay as they are.

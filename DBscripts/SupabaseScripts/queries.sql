-- 20) Export queue status counts
select status, count(*) as cnt
from "EXPORTFILE"
group by status
order by cnt desc;



-- 16) Projects per user (leaderboard)
select email, count(*) as project_count
from "PROJECT"
group by email
order by project_count desc, email;



-- 26) Admins with active/trial subs and at least 1 project
select u.email, count(p.project_id) as projects
from "USER" u
join "SUBSCRIPTION" s using (email)
left join "PROJECT" p on p.email = u.email
where u.user_role = 'admin'
  and s.status in ('active','trialing','past_due')
group by u.email
having count(p.project_id) > 0;

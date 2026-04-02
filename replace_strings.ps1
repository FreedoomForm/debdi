$content = Get-Content -Path "c:\Users\User\Downloads\ace-2e16dbc2a18e8ab118a676bbaed386a0abc647e9\ace-2e16dbc2a18e8ab118a676bbaed386a0abc647e9\src\app\middle-admin\page.tsx" -Encoding UTF8
$replacements = @{
    '<h2>Массовое редактирование заказов</h2>' = '<h2>{t.admin.actions_new.bulkUpdateOrders.replace("{count}", selectedOrders.size.ToString())}</h2>'
    '<h2>Массовое редактирование клиентов</h2>' = '<h2>{t.admin.actions_new.bulkUpdateClients.replace("{count}", selectedClients.size.ToString())}</h2>'
    'Измените параметры для нескольких выбранных объектов. Оставьте поля пустыми, чтобы не менять их.' = '{t.admin.actions_new.bulkUpdateDesc}'
    '<option value="">Не менять</option>' = '<option value="">{t.admin.actions_new.noChange}</option>'
    '<option value="PENDING">Ожидает</option>' = '<option value="PENDING">{t.admin.pending}</option>'
    '<option value="DELIVERED">Доставлен</option>' = '<option value="DELIVERED">{t.admin.delivered}</option>'
    '<option value="FAILED">Отменен</option>' = '<option value="FAILED">{t.admin.status_new.cancelled}</option>'
    '<option value="PAID">Оплачено</option>' = '<option value="PAID">{t.admin.actions_new.paid}</option>'
    '<option value="UNPAID">Не оплачено</option>' = '<option value="UNPAID">{t.admin.actions_new.unpaid}</option>'
    '<option value="none">Нет курьера</option>' = '<option value="none">{t.admin.actions_new.none}</option>'
    '<option value="true">Активен</option>' = '<option value="true">{t.admin.actions_new.active}</option>'
    '<option value="false">Приостановлен</option>' = '<option value="false">{t.admin.actions_new.suspended}</option>'
}

foreach ($old in $replacements.Keys) {
    $new = $replacements[$old]
    $content = $content.Replace($old, $new)
}

$content | Set-Content -Path "c:\Users\User\Downloads\ace-2e16dbc2a18e8ab118a676bbaed386a0abc647e9\ace-2e16dbc2a18e8ab118a676bbaed386a0abc647e9\src\app\middle-admin\page.tsx" -Encoding UTF8

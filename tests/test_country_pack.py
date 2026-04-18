from agro_v2.country_pack import resolve_country_policy


def test_resolve_country_policy_ghana():
    policy = resolve_country_policy("gh")
    assert policy.country_code == "GH"
    assert policy.region == "west_africa"
    assert policy.supports_ussd is True


def test_resolve_country_policy_jamaica():
    policy = resolve_country_policy("JM")
    assert policy.region == "caribbean"
    assert policy.currency == "JMD"
    assert policy.supports_ussd is False


def test_resolve_country_policy_invalid():
    try:
        resolve_country_policy("ZZ")
        assert False, "Expected ValueError for unsupported country"
    except ValueError as exc:
        assert "Unsupported country code" in str(exc)


def average(readings):
    """Return the average of non-None readings, or None if none exist."""
    values = [x for x in readings if x is not None]
    if not values:
        return None
    return sum(values) / len(values)


def test_average_regular_readings():
    assert average([1, 2, 3]) == 2


def test_zero_is_included():
    assert average([0, 2, None]) == 1


def test_only_zero():
    assert average([0]) == 0


def test_none_is_ignored():
    assert average([1, None, 3]) == 2


def test_empty_input():
    assert average([]) is None


def test_all_missing():
    assert average([None, None]) is None


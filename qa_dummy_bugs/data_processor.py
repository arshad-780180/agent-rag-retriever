def process_data(data_list):
    # BUG: Attempting to access an index that might be out of bounds if list is empty
    first_item = data_list[0]
    last_item = data_list[len(data_list)] # Off by one error!
    return first_item + last_item

if __name__ == "__main__":
    process_data([1, 2, 3])
